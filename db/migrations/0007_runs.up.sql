-- #234, ADR 0034: runs. A run is one workflow happening for one household,
-- about one thing, for an audience: the planners, or one member. A press
-- claims it only if it's still at that step and revision, with a short
-- lease; the commit moves it and queues its messages in the same call. A
-- household's bot can be switched off; its runs wait. Row-level security
-- on with no policy: only these functions reach it, each checking the
-- Worker's secret first (ADR 0032).

alter table households add column bot_off boolean not null default false;

create table runs (
  id text primary key,
  household uuid not null references households (id) on delete cascade,
  -- 'planners', or a member's id.
  audience text not null,
  workflow text not null,
  step text,
  about jsonb not null default '{}'::jsonb,
  status text not null
    check (status in ('due', 'waiting', 'done', 'expired', 'cancelled')),
  rev int not null default 0,
  lease timestamptz,
  due_at timestamptz not null,
  expires_at timestamptz,
  -- Its step takes her text or photo: it holds her floor.
  floor boolean not null default false,
  -- Our ids of the messages it sent last.
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null
);
create index runs_due on runs (due_at) where status = 'due';
create index runs_open on runs (household, audience) where status = 'waiting';
alter table runs enable row level security;

create function run_json(r runs) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'household', r.household, 'audience', r.audience,
    'workflow', r.workflow, 'step', r.step, 'about', r.about,
    'status', r.status, 'rev', r.rev, 'lease', r.lease, 'dueAt', r.due_at,
    'expiresAt', r.expires_at, 'floor', r.floor, 'messages', r.messages
  )
$$;

-- The members a run speaks to: its member, or every planner.
create function run_members(r runs) returns setof members
language sql stable set search_path = public as $$
  select m.* from members m
  where m.household = r.household
    and (m.id::text = r.audience or (r.audience = 'planners' and m.role = 'plan'))
$$;

create function run_create(p_secret text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r runs;
begin
  perform msg_check(p_secret);
  insert into runs (
    id, household, audience, workflow, about, status, due_at, expires_at,
    created_at
  ) values (
    p_row->>'id', (p_row->>'household')::uuid, p_row->>'audience',
    p_row->>'workflow', coalesce(p_row->'about', '{}'::jsonb), 'due',
    (p_row->>'dueAt')::timestamptz, (p_row->>'expiresAt')::timestamptz,
    (p_row->>'now')::timestamptz
  ) returning * into r;
  return run_json(r);
end $$;

create function run_get(p_secret text, p_id text)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select run_json(r) || jsonb_build_object('botOff', h.bot_off)
  from runs r join households h on h.id = r.household
  where r.id = p_id
$$;

create function run_conversations(p_secret text, p_id text)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(m.conversation order by m.seq), '[]'::jsonb)
  from runs r cross join lateral run_members(r) m
  where r.id = p_id and m.conversation is not null
$$;

-- Waiting runs a member answers: their own, and the planners' if a planner.
create function runs_open(p_secret text, p_member uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(run_json(r) order by r.created_at, r.id), '[]'::jsonb)
  from runs r join members m on m.id = p_member and m.household = r.household
  where r.status = 'waiting'
    and (r.audience = m.id::text or (r.audience = 'planners' and m.role = 'plan'))
$$;

-- One press wins: the run must still be at that step and revision, and
-- nobody else's lease may be running.
create function run_claim(
  p_secret text, p_id text, p_step text, p_rev int, p_now timestamptz,
  p_until timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r runs;
begin
  perform msg_check(p_secret);
  update runs set rev = rev + 1, lease = p_until
  where id = p_id and rev = p_rev and step is not distinct from p_step
    and status in ('due', 'waiting') and (lease is null or lease <= p_now)
  returning * into r;
  if not found then return null; end if;
  return run_json(r);
end $$;

-- The claimed run moved to its next step, and its messages recorded and
-- queued, in one call: both happen, or neither.
create function run_commit(
  p_secret text, p_id text, p_rev int, p_next jsonb, p_messages jsonb,
  p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r runs;
  m jsonb;
  added jsonb;
  ids jsonb := '[]'::jsonb;
begin
  perform msg_check(p_secret);
  select * into r from runs
  where id = p_id and rev = p_rev and lease is not null for update;
  if not found then
    return jsonb_build_object('ok', false, 'ids', '[]'::jsonb);
  end if;
  for m in select value from jsonb_array_elements(p_messages) loop
    added := msg_message_add(p_secret, jsonb_build_object(
      'conversation', m->>'conversation', 'direction', 'out',
      'kind', m->'message'->>'kind', 'content', m->'message',
      'answers', null, 'channelId', null, 'at', p_now, 'status', 'queued',
      'error', null, 'context', m->'context'
    ));
    perform msg_outbox_enqueue(p_secret, (added->>'id')::uuid, p_now);
    ids := ids || jsonb_build_array(added->>'id');
  end loop;
  update runs set
    step = p_next->>'step', status = p_next->>'status',
    floor = coalesce((p_next->>'floor')::boolean, false),
    rev = rev + 1, lease = null, messages = ids
  where id = p_id;
  return jsonb_build_object('ok', true, 'ids', ids);
end $$;

-- Due runs to start: none of a household that's off, none for a person who
-- holds the floor with another run.
create function runs_due(p_secret text, p_now timestamptz)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(run_json(r) order by r.due_at, r.id), '[]'::jsonb)
  from runs r join households h on h.id = r.household
  where r.status = 'due' and r.due_at <= p_now and not h.bot_off
    and not exists (
      select 1 from runs o
      where o.household = r.household and o.audience = r.audience
        and o.status = 'waiting' and o.floor
    )
$$;

create function runs_expired(p_secret text, p_now timestamptz)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(run_json(r) order by r.expires_at, r.id), '[]'::jsonb)
  from runs r join households h on h.id = r.household
  where r.status = 'waiting' and r.expires_at <= p_now and not h.bot_off
$$;

create function hh_bot_off(p_secret text, p_account uuid, p_off boolean)
returns void language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  update households set bot_off = p_off
  where id = (hh_member_of(p_account)).household
$$;
