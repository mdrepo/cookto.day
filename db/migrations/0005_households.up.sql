-- #217, ADR 0033: households. A household owns the kitchen: members by
-- account (planners) or by Telegram chat (the cook), records whole at their
-- version, and a changes log with one sequence, so every phone can ask
-- "what changed after my cursor". Invites are links with the purpose
-- 'invite' and a role. Every table has row-level security on with no
-- policy: only the functions below reach them, each checking the Worker's
-- secret first (ADR 0032).

create table households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null,
  -- Sends today, for the 20-a-day limit (spec #207, now per household).
  sends_on date,
  sends int not null default 0,
  -- The highest change sequence the nightly job has deleted: a phone with
  -- a cursor below it starts over from the records.
  purged_through bigint not null default 0
);
alter table households enable row level security;

create table members (
  id uuid primary key default gen_random_uuid(),
  household uuid not null references households (id) on delete cascade,
  account uuid references accounts (id) on delete cascade,
  chat text,
  conversation uuid references conversations (id) on delete set null,
  role text not null check (role in ('plan', 'cook')),
  joined_at timestamptz not null,
  seq bigint generated always as identity
);
create unique index members_one_household_per_account
  on members (account) where account is not null;
create index members_household on members (household, seq);
alter table members enable row level security;

create table records (
  household uuid not null references households (id) on delete cascade,
  collection text not null,
  id text not null,
  record jsonb not null,
  version int not null,
  updated_at timestamptz not null,
  primary key (household, collection, id)
);
alter table records enable row level security;

create table changes (
  seq bigint generated always as identity primary key,
  household uuid not null references households (id) on delete cascade,
  collection text not null,
  record jsonb not null,
  at timestamptz not null
);
create index changes_household_seq on changes (household, seq);
alter table changes enable row level security;

alter table links
  drop constraint links_purpose_check,
  add constraint links_purpose_check
    check (purpose in ('cook', 'sign-in', 'invite')),
  add column role text check (role in ('plan', 'cook')),
  add column household uuid references households (id) on delete cascade;

-- The member row an account has, if any.
create function hh_member_of(p_account uuid) returns members
language sql stable set search_path = public as $$
  select * from members where account = p_account
$$;

create function hh_member_json(m members) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', m.id, 'role', m.role,
    'kind', case when m.account is null then 'telegram' else 'account' end,
    'name', (select name from identities where account = m.account limit 1),
    'stopped', m.account is null and m.conversation is null
  )
$$;

-- Records pushed: the newer version is kept and logged; the rest refused,
-- each with the server's copy. Internal: the callers check the secret.
create function hh_take(p_household uuid, p_records jsonb, p_now timestamptz)
returns jsonb language plpgsql set search_path = public as $$
declare
  r jsonb;
  have records;
  refused jsonb := '[]'::jsonb;
  coll text;
  rid text;
  v int;
begin
  for r in select * from jsonb_array_elements(p_records) loop
    coll := r->>'collection';
    rid := r->'record'->>'id';
    v := (r->'record'->>'version')::int;
    select * into have from records
      where household = p_household and collection = coll and id = rid for update;
    if have.id is not null and have.version >= v then
      refused := refused || jsonb_build_object('collection', have.collection,
                                               'record', have.record);
      continue;
    end if;
    insert into records (household, collection, id, record, version, updated_at)
      values (p_household, coll, rid, r->'record', v, p_now)
      on conflict (household, collection, id) do update
        set record = excluded.record, version = excluded.version,
            updated_at = excluded.updated_at;
    insert into changes (household, collection, record, at)
      values (p_household, coll, r->'record', p_now);
  end loop;
  return refused;
end $$;

-- Signing in on a phone with no household starts one from its records.
create function hh_create(p_secret text, p_account uuid, p_records jsonb, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  perform msg_check(p_secret);
  -- A row with null fields is neither null nor not null: ask for its id.
  if (hh_member_of(p_account)).id is not null then
    return jsonb_build_object('ok', false, 'reason', 'exists');
  end if;
  insert into households (created_at) values (p_now) returning id into h;
  insert into members (household, account, role, joined_at)
    values (h, p_account, 'plan', p_now);
  perform hh_take(h, p_records, p_now);
  return jsonb_build_object('ok', true, 'household', h);
end $$;

-- The cook's link a phone held (spec #207) moves into the household.
create function hh_claim_cook(p_secret text, p_account uuid, p_token_hash text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  l links;
  c conversations;
  member uuid;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  select * into l from links
    where token_hash = p_token_hash and purpose = 'cook' and conversation is not null
    for update;
  if me.id is null or l.code is null then
    return jsonb_build_object('ok', false);
  end if;
  select * into c from conversations where id = l.conversation;
  if c.id is null then return jsonb_build_object('ok', false); end if;
  insert into members (household, chat, conversation, role, joined_at)
    values (me.household, c.chat, c.id, 'cook', p_now) returning id into member;
  update conversations set owner_kind = 'member', owner_id = member::text
    where id = c.id;
  delete from links where code = l.code;
  return jsonb_build_object('ok', true);
end $$;

create function hh_get(p_secret text, p_account uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me members;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  if me.id is null then return null; end if;
  return jsonb_build_object('id', me.household, 'members',
    (select coalesce(jsonb_agg(hh_member_json(m) order by m.seq), '[]'::jsonb)
       from members m where m.household = me.household));
end $$;

-- An invite: a code with a role, made the way the cook's links are.
create function hh_invite(
  p_secret text, p_account uuid, p_role text, p_address_hash text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  made jsonb;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  if me.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no-household');
  end if;
  made := msg_link_make(p_secret, p_address_hash, p_now);
  if (made->>'ok')::boolean then
    update links set purpose = 'invite', role = p_role, household = me.household
      where code = made->>'code';
  end if;
  return made;
end $$;

-- Start with an invite's code: the cook gets a conversation of the
-- household; a planner gets (or already has) an account and joins.
create function hh_invite_start(
  p_secret text, p_code text, p_channel text, p_chat text,
  p_user_id text, p_name text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  member uuid;
  c jsonb;
  acct uuid;
begin
  perform msg_check(p_secret);
  select * into l from links where code = upper(replace(p_code, '-', '')) for update;
  if l.code is null or l.purpose <> 'invite' then
    return jsonb_build_object('ok', false, 'reason', 'not-invite');
  end if;
  if l.used_at is not null or l.expires_at < p_now
     or (l.role = 'plan' and p_user_id is null) then
    return jsonb_build_object('ok', false, 'reason', 'bad');
  end if;
  update links set used_at = p_now where code = l.code;
  if l.role = 'cook' then
    insert into members (household, chat, role, joined_at)
      values (l.household, p_chat, 'cook', p_now) returning id into member;
    c := msg_conversation_open(p_secret, p_channel, p_chat, 'member', member::text, p_now);
    update members set conversation = (c->>'id')::uuid where id = member;
    return jsonb_build_object('ok', true, 'role', 'cook', 'conversation', c);
  end if;
  select account into acct from identities
    where channel = p_channel and user_id = p_user_id;
  if acct is null then
    insert into accounts (created_at) values (p_now) returning id into acct;
    insert into identities (channel, user_id, account, name, created_at)
      values (p_channel, p_user_id, acct, p_name, p_now);
  end if;
  if (hh_member_of(acct)).id is null then
    insert into members (household, account, chat, role, joined_at)
      values (l.household, acct, p_chat, 'plan', p_now);
  end if;
  return jsonb_build_object('ok', true, 'role', 'plan');
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'hh\_%' or p.proname like 'sync\_%')
  loop
    execute format('revoke all on function %s from public', f);
  end loop;
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'hh\_%' or p.proname like 'sync\_%')
      and p.prosecdef
  loop
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
