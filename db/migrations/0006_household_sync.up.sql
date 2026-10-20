-- #217, ADR 0033: the household's second half. Removing a member, the
-- cooks a send goes to, deleting an account all the way down, and sync:
-- push takes the newer version, pull pages the changes, the nightly job
-- drops changes older than 90 days. Split from 0005 to keep each file small.

create function hh_member_remove(p_secret text, p_account uuid, p_member uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  m members;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  select * into m from members where id = p_member and household = me.household;
  if m.id is null then return jsonb_build_object('ok', false); end if;
  delete from conversations where id = m.conversation;
  delete from members where id = m.id;
  return jsonb_build_object('ok', true, 'chat', m.chat);
end $$;

-- The cooks' conversations, if sending is allowed: twenty a day per household.
create function hh_cooks(p_secret text, p_account uuid, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  h households;
  today date := (p_now at time zone 'UTC')::date;
  chats jsonb;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  select * into h from households where id = me.household for update;
  if h.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no-household');
  end if;
  select jsonb_agg(m.conversation order by m.seq) into chats from members m
    where m.household = h.id and m.role = 'cook' and m.conversation is not null;
  if chats is null then
    return jsonb_build_object('ok', false, 'reason', 'no-cook');
  end if;
  if h.sends_on is distinct from today then
    update households set sends_on = today, sends = 0 where id = h.id;
    h.sends := 0;
  end if;
  if h.sends >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  update households set sends = sends + 1 where id = h.id;
  return jsonb_build_object('ok', true, 'conversations', chats);
end $$;

-- "Delete my account": the account, its identities, sessions and
-- membership; as the last planner, the household and all it holds.
create function hh_account_delete(p_secret text, p_account uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  gone boolean := false;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  if me.id is not null then
    delete from members where id = me.id;
    if not exists (select 1 from members where household = me.household and account is not null) then
      delete from conversations where id in
        (select conversation from members where household = me.household);
      delete from households where id = me.household;
      gone := true;
    end if;
  end if;
  delete from accounts where id = p_account;
  return jsonb_build_object('household', gone);
end $$;

create function sync_push(p_secret text, p_account uuid, p_records jsonb, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me members;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  if me.id is null then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'refused', hh_take(me.household, p_records, p_now));
end $$;

-- Changes after a cursor, a page at a time; every record when the cursor
-- is older than what's kept.
create function sync_changes(p_secret text, p_account uuid, p_after bigint, p_limit int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me members;
  h households;
  latest bigint;
  page jsonb;
  n int;
begin
  perform msg_check(p_secret);
  me := hh_member_of(p_account);
  select * into h from households where id = me.household;
  if h.id is null then return null; end if;
  select coalesce(max(seq), 0) into latest from changes where household = h.id;
  latest := greatest(latest, h.purged_through);
  if p_after < h.purged_through then
    select coalesce(jsonb_agg(jsonb_build_object(
        'seq', latest, 'collection', r.collection, 'record', r.record,
        'at', msg_iso(r.updated_at)) order by r.collection, r.id), '[]'::jsonb)
      into page from records r where r.household = h.id;
    return jsonb_build_object('changes', page, 'cursor', latest,
                              'more', false, 'reset', true);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'seq', c.seq, 'collection', c.collection, 'record', c.record,
      'at', msg_iso(c.at)) order by c.seq), '[]'::jsonb), count(*)
    into page, n
    from (select * from changes where household = h.id and seq > p_after
            order by seq limit p_limit) c;
  return jsonb_build_object(
    'changes', page,
    'cursor', coalesce((page->-1->>'seq')::bigint, p_after),
    'more', exists (select 1 from changes where household = h.id
                      and seq > coalesce((page->-1->>'seq')::bigint, p_after)),
    'reset', false);
end $$;

-- The nightly job's share: changes older than 90 days, remembered per household.
create function hh_housekeeping(p_secret text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare gone int;
begin
  perform msg_check(p_secret);
  with dropped as (
    delete from changes where at < p_now - interval '90 days'
    returning household, seq
  ), bumped as (
    update households h set purged_through = greatest(h.purged_through, d.top)
      from (select household, max(seq) as top from dropped group by household) d
      where h.id = d.household
    returning 1
  )
  select count(*) into gone from dropped;
  return jsonb_build_object('changes', gone);
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
