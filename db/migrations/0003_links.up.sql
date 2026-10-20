-- #207, ADR 0031: links. A phone asks for a code; the cook sends it to the
-- bot; the conversation that opens belongs to the link, whose token the
-- phone keeps. The token is stored only as its sha256, and only ever handed
-- out once, when the link is made.

create table links (
  code text primary key,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  conversation uuid references conversations (id) on delete set null,
  -- Sends today, for the 20-a-day limit (spec #207).
  sends_on date,
  sends int not null default 0
);
alter table links enable row level security;

-- Links asked for per network address per day, as a keyed hash (ADR 0028).
create table link_requests (
  address_hash text not null,
  day date not null,
  n int not null default 0,
  primary key (address_hash, day)
);
alter table link_requests enable row level security;

-- 8 characters without 0, O, 1 and I, so it survives being read out loud.
create function msg_link_code() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 32) + 1, 1), ''
  ) from gen_random_bytes(8) b, generate_series(0, 7) i
$$;

create function msg_link_make(p_secret text, p_address_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  today date := (p_now at time zone 'UTC')::date;
  asked int;
  new_code text;
  new_token text;
begin
  perform msg_check(p_secret);
  insert into link_requests (address_hash, day, n) values (p_address_hash, today, 1)
  on conflict (address_hash, day) do update set n = link_requests.n + 1
  returning n into asked;
  if asked > 10 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  new_token := encode(gen_random_bytes(32), 'hex');
  loop
    new_code := msg_link_code();
    exit when not exists (select 1 from links where code = new_code);
  end loop;
  insert into links (code, token_hash, created_at, expires_at)
  values (new_code, encode(digest(new_token, 'sha256'), 'hex'), p_now,
          p_now + interval '10 minutes');
  return jsonb_build_object(
    'ok', true, 'code', new_code, 'token', new_token,
    'expiresAt', msg_iso(p_now + interval '10 minutes')
  );
end $$;

-- The cook pressed Start with a code: the conversation opens, owned by the
-- link. A code works once, within ten minutes.
create function msg_link_connect(
  p_secret text, p_code text, p_channel text, p_chat text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  c jsonb;
begin
  perform msg_check(p_secret);
  select * into l from links where code = upper(replace(p_code, '-', '')) for update;
  if l.code is null or l.used_at is not null or l.expires_at < p_now then
    return jsonb_build_object('ok', false);
  end if;
  c := msg_conversation_open(p_secret, p_channel, p_chat, 'link', l.token_hash, p_now);
  update links set used_at = p_now, conversation = (c->>'id')::uuid where code = l.code;
  return jsonb_build_object('ok', true, 'conversation', c);
end $$;

create function msg_link_status(p_secret text, p_token_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l links;
begin
  perform msg_check(p_secret);
  select * into l from links where token_hash = p_token_hash;
  if l.code is null then
    return jsonb_build_object('state', 'gone');
  elsif l.conversation is not null then
    return jsonb_build_object('state', 'connected',
      'conversation', msg_conversation_get(p_secret, l.conversation));
  elsif l.used_at is not null then
    return jsonb_build_object('state', 'gone');
  elsif l.expires_at < p_now then
    return jsonb_build_object('state', 'expired');
  end if;
  return jsonb_build_object('state', 'waiting');
end $$;

-- Disconnect, from either side: the conversation, its messages and the link.
create function msg_link_remove(p_secret text, p_token_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare l links;
begin
  perform msg_check(p_secret);
  select * into l from links where token_hash = p_token_hash;
  if l.code is null then return false; end if;
  delete from conversations where id = l.conversation;
  delete from links where code = l.code;
  return true;
end $$;

-- One more send today, if the link is connected and under its limit.
create function msg_link_send_allowed(p_secret text, p_token_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  today date := (p_now at time zone 'UTC')::date;
begin
  perform msg_check(p_secret);
  select * into l from links where token_hash = p_token_hash for update;
  if l.code is null or l.conversation is null then
    return jsonb_build_object('ok', false, 'reason', 'gone');
  end if;
  if l.sends_on is distinct from today then
    update links set sends_on = today, sends = 0 where code = l.code;
    l.sends := 0;
  end if;
  if l.sends >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  update links set sends = sends + 1 where code = l.code;
  return jsonb_build_object('ok', true, 'conversation', l.conversation);
end $$;

-- The nightly job: old messages, old seen updates, dead links (ADR 0031).
create function msg_housekeeping(p_secret text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare messages_gone int; updates_gone int; links_gone int;
begin
  perform msg_check(p_secret);
  messages_gone := msg_messages_purge(p_secret, p_now - interval '90 days');
  delete from seen_updates where at < p_now - interval '1 day';
  get diagnostics updates_gone = row_count;
  delete from links where conversation is null
    and (used_at is not null or expires_at < p_now - interval '1 day');
  get diagnostics links_gone = row_count;
  delete from link_requests where day < (p_now at time zone 'UTC')::date - 1;
  return jsonb_build_object('messages', messages_gone, 'updates', updates_gone,
                            'links', links_gone);
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'msg\_link%'
       or n.nspname = 'public' and p.proname = 'msg_housekeeping'
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
