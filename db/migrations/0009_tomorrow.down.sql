-- Undoes 0009: tomorrow's plan in Telegram.
drop function if exists auth_telegram_session(text, text, text, timestamptz);
drop function if exists hh_reach_planners(text, uuid, text, timestamptz);
drop function if exists hh_put(text, uuid, jsonb, timestamptz);
drop function if exists hh_list(text);

-- run_members as 0007 made it: its member, or every planner.
create or replace function run_members(r runs) returns setof members
language sql stable set search_path = public as $$
  select m.* from members m
  where m.household = r.household
    and (m.id::text = r.audience or (r.audience = 'planners' and m.role = 'plan'))
$$;
