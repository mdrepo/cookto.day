-- Undoes 0011: names. The functions as 0005 made them: a cook joins with
-- no name, and a member's name is only a planner's from sign-in.
drop function if exists hh_name_cook(text, uuid, text);
drop function if exists hh_people(text, uuid);

create or replace function hh_member_json(m members) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', m.id, 'role', m.role,
    'kind', case when m.account is null then 'telegram' else 'account' end,
    'name', (select name from identities where account = m.account limit 1),
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

alter table members drop column if exists name;
