-- #241: tomorrow's plan in Telegram. Functions only, no tables. The cron
-- lists every household with its switch; the server writes a household's
-- records by the phones' rules (sorted, a day off); a planner is reached in
-- the private chat they signed in from, whose id on Telegram is their own;
-- a run for 'cooks' speaks to every cook; and a web app the bot opened gets
-- a session for the Telegram account it proves (ADR 0032, 0033).

create function hh_list(p_secret text)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'botOff', h.bot_off)
           order by h.created_at, h.id), '[]'::jsonb)
  from households h
$$;

create function hh_put(p_secret text, p_household uuid, p_records jsonb, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform msg_check(p_secret);
  return hh_take(p_household, p_records, p_now);
end $$;

create function hh_reach_planners(p_secret text, p_household uuid, p_channel text, p_now timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  m members;
  who text;
  c uuid;
begin
  perform msg_check(p_secret);
  for m in select * from members
    where household = p_household and role = 'plan'
      and account is not null and conversation is null
  loop
    select user_id into who from identities
      where account = m.account and channel = p_channel limit 1;
    continue when who is null;
    insert into conversations (channel, chat, owner_kind, owner_id, started_at)
      values (p_channel, who, 'member', m.id::text, p_now)
      on conflict (channel, chat) do update
        set owner_kind = excluded.owner_kind, owner_id = excluded.owner_id
      returning id into c;
    update members set conversation = c, chat = who where id = m.id;
  end loop;
end $$;

-- The members a run speaks to: its member, every planner, or every cook.
create or replace function run_members(r runs) returns setof members
language sql stable set search_path = public as $$
  select m.* from members m
  where m.household = r.household
    and (m.id::text = r.audience
         or (r.audience = 'planners' and m.role = 'plan')
         or (r.audience = 'cooks' and m.role = 'cook'))
$$;

create function auth_telegram_session(p_secret text, p_channel text, p_user_id text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  acct uuid;
  who text;
  token text;
begin
  perform msg_check(p_secret);
  select account, name into acct, who from identities
    where channel = p_channel and user_id = p_user_id;
  if acct is null then return null; end if;
  token := encode(gen_random_bytes(32), 'hex');
  insert into sessions (hash, account, created_at, last_used_at)
    values (encode(digest(token, 'sha256'), 'hex'), acct, p_now, p_now);
  return jsonb_build_object('name', who, 'session', token);
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('hh_list', 'hh_put', 'hh_reach_planners', 'auth_telegram_session')
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
