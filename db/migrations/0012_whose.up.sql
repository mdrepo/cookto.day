-- #270: commands in the chat. A command comes from a member's chat; the bot
-- asks whose household that member is in, and as what, to decide what the
-- command does: a planner's /tomorrow, the cook's /ranout (ADR 0032, 0033).

create function hh_whose(p_secret text, p_member uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select jsonb_build_object('household', m.household, 'role', m.role)
  from members m where m.id = p_member
$$;

revoke all on function hh_whose(text, uuid) from public;
grant execute on function hh_whose(text, uuid) to anon, authenticated;
