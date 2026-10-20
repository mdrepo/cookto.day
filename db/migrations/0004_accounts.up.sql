-- #216, ADR 0033: sign in with Telegram. An account is ours; an identity
-- maps a channel's user id to it, with the first name the channel gave; a
-- session is a hash with its last use. A sign-in link is a link with the
-- purpose 'sign-in': the same code and token as the cook's, used once by
-- Start, then claimed once by the phone, which gets the session token.
-- Every table has row-level security on with no policy: only the functions
-- below reach them, and each checks the Worker's secret first (ADR 0032).

create table accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null
);
alter table accounts enable row level security;

create table identities (
  channel text not null,
  user_id text not null,
  account uuid not null references accounts (id) on delete cascade,
  -- The first name the channel gave, for "Signed in as". Nothing else.
  name text not null,
  created_at timestamptz not null,
  primary key (channel, user_id)
);
create index identities_account on identities (account);
alter table identities enable row level security;

create table sessions (
  -- sha256 of the token, hex. The token itself goes to the phone once.
  hash text primary key,
  account uuid not null references accounts (id) on delete cascade,
  created_at timestamptz not null,
  last_used_at timestamptz not null
);
create index sessions_account on sessions (account);
alter table sessions enable row level security;

alter table links
  add column purpose text not null default 'cook'
    check (purpose in ('cook', 'sign-in')),
  add column account uuid references accounts (id) on delete cascade,
  add column session_issued_at timestamptz;

-- A sign-in link: as msg_link_make, with the purpose; the same ten a day.
create function auth_link_make(p_secret text, p_address_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  made jsonb;
begin
  made := msg_link_make(p_secret, p_address_hash, p_now);
  if (made->>'ok')::boolean then
    update links set purpose = 'sign-in' where code = made->>'code';
  end if;
  return made;
end $$;

-- A cook's code only: a sign-in code can't connect a cook (spec #216).
create or replace function msg_link_connect(
  p_secret text, p_code text, p_channel text, p_chat text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  c jsonb;
begin
  perform msg_check(p_secret);
  select * into l from links where code = upper(replace(p_code, '-', '')) for update;
  if l.code is null or l.purpose <> 'cook' or l.used_at is not null
     or l.expires_at < p_now then
    return jsonb_build_object('ok', false);
  end if;
  c := msg_conversation_open(p_secret, p_channel, p_chat, 'link', l.token_hash, p_now);
  update links set used_at = p_now, conversation = (c->>'id')::uuid where code = l.code;
  return jsonb_build_object('ok', true, 'conversation', c);
end $$;

-- Start with a sign-in code: the identity is made or found, the link used.
create function auth_start(
  p_secret text, p_code text, p_channel text, p_user_id text, p_name text,
  p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  acct uuid;
  known text;
begin
  perform msg_check(p_secret);
  select * into l from links where code = upper(replace(p_code, '-', '')) for update;
  if l.code is null or l.purpose <> 'sign-in' then
    return jsonb_build_object('ok', false, 'reason', 'not-sign-in');
  end if;
  if l.used_at is not null or l.expires_at < p_now then
    return jsonb_build_object('ok', false, 'reason', 'bad');
  end if;
  select account, name into acct, known from identities
    where channel = p_channel and user_id = p_user_id;
  if acct is null then
    insert into accounts (created_at) values (p_now) returning id into acct;
    insert into identities (channel, user_id, account, name, created_at)
      values (p_channel, p_user_id, acct, p_name, p_now);
    known := p_name;
  end if;
  update links set used_at = p_now, account = acct where code = l.code;
  return jsonb_build_object('ok', true, 'name', known);
end $$;

-- The phone's poll: waiting, expired, or, once, the session's token.
create function auth_claim(p_secret text, p_token_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  l links;
  token text;
  who text;
begin
  perform msg_check(p_secret);
  select * into l from links where token_hash = p_token_hash for update;
  if l.code is null or l.purpose <> 'sign-in' or l.session_issued_at is not null then
    return jsonb_build_object('state', 'gone');
  elsif l.used_at is null then
    return jsonb_build_object('state',
      case when l.expires_at < p_now then 'expired' else 'waiting' end);
  end if;
  token := encode(gen_random_bytes(32), 'hex');
  insert into sessions (hash, account, created_at, last_used_at)
    values (encode(digest(token, 'sha256'), 'hex'), l.account, p_now, p_now);
  update links set session_issued_at = p_now where code = l.code;
  select name into who from identities where account = l.account limit 1;
  return jsonb_build_object('state', 'used', 'name', who, 'session', token);
end $$;

-- A session by its hash: the account and name, and its last use moved;
-- null, and the row gone, after 30 days without use.
create function auth_session(p_secret text, p_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  who text;
begin
  perform msg_check(p_secret);
  select * into s from sessions where hash = p_hash for update;
  if s.hash is null then return null; end if;
  if s.last_used_at < p_now - interval '30 days' then
    delete from sessions where hash = p_hash;
    return null;
  end if;
  update sessions set last_used_at = p_now where hash = p_hash;
  select name into who from identities where account = s.account limit 1;
  return jsonb_build_object('account', s.account, 'name', who);
end $$;

create function auth_session_end(p_secret text, p_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform msg_check(p_secret);
  delete from sessions where hash = p_hash;
  return found;
end $$;

-- The nightly job's share: sessions unused for 30 days.
create function auth_housekeeping(p_secret text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare gone int;
begin
  perform msg_check(p_secret);
  delete from sessions where last_used_at < p_now - interval '30 days';
  get diagnostics gone = row_count;
  return jsonb_build_object('sessions', gone);
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'auth\_%'
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
