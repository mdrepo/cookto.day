-- #270: the bot calls people by name. A member keeps the cook's first name
-- from Telegram, given when she joins or at her next tap; a planner's comes
-- from their sign-in, as before. The bot lists who's in a household, each
-- with a name and a conversation, to say "Sunita" and to know when the
-- planners cook (ADR 0032, 0033).

alter table members add column name text;

create or replace function hh_member_json(m members) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', m.id, 'role', m.role,
    'kind', case when m.account is null then 'telegram' else 'account' end,
    'name', coalesce(m.name,
      (select name from identities where account = m.account limit 1)),
    'stopped', m.account is null and m.conversation is null
  )
$$;

create or replace function hh_invite_start(
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
    insert into members (household, chat, role, joined_at, name)
      values (l.household, p_chat, 'cook', p_now, p_name) returning id into member;
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

create function hh_people(p_secret text, p_household uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'role', m.role,
      'name', coalesce(m.name,
        (select name from identities where account = m.account limit 1)),
      'conversation', m.conversation
    ) order by m.seq), '[]'::jsonb)
  from members m where m.household = p_household
$$;

create function hh_name_cook(p_secret text, p_member uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform msg_check(p_secret);
  update members set name = p_name
    where id = p_member and role = 'cook' and name is distinct from p_name;
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('hh_people', 'hh_name_cook')
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
