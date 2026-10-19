-- #207, ADR 0031: the functions the Worker calls, one per method of the
-- messenger's Store. Each is security definer, so it may touch the tables
-- the anonymous role can't, and each checks the Worker's secret first.
-- Rows go out as JSON in the shape the package uses, with ISO times.

create function msg_check(p_secret text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from api_secrets
    where name = 'messenger' and hash = encode(digest(p_secret, 'sha256'), 'hex')
  ) then
    raise insufficient_privilege using message = 'messenger-secret';
  end if;
end $$;

create function msg_iso(p_at timestamptz) returns text
language sql immutable as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

create function msg_conversation_json(c conversations) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', c.id, 'channel', c.channel, 'chat', c.chat,
    'owner', jsonb_build_object('kind', c.owner_kind, 'id', c.owner_id),
    'startedAt', msg_iso(c.started_at),
    'lastMessageAt', case when c.last_message_at is null then null
                          else to_jsonb(msg_iso(c.last_message_at)) end
  )
$$;

create function msg_message_json(m messages) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', m.id, 'conversation', m.conversation, 'direction', m.direction,
    'kind', m.kind, 'content', m.content, 'answers', m.answers,
    'channelId', m.channel_id, 'at', msg_iso(m.at), 'status', m.status,
    'error', m.error, 'context', m.context
  )
$$;

create function msg_conversation_find(p_secret text, p_channel text, p_chat text)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select msg_conversation_json(c) from conversations c
  where c.channel = p_channel and c.chat = p_chat
$$;

create function msg_conversation_get(p_secret text, p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select msg_conversation_json(c) from conversations c where c.id = p_id
$$;

create function msg_conversation_open(
  p_secret text, p_channel text, p_chat text,
  p_owner_kind text, p_owner_id text, p_now timestamptz
) returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  insert into conversations (channel, chat, owner_kind, owner_id, started_at)
  values (p_channel, p_chat, p_owner_kind, p_owner_id, p_now)
  on conflict (channel, chat) do update
    set owner_kind = excluded.owner_kind, owner_id = excluded.owner_id
  returning msg_conversation_json(conversations)
$$;

create function msg_conversation_remove(p_secret text, p_id uuid)
returns void language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  delete from conversations where id = p_id
$$;

create function msg_update_seen(
  p_secret text, p_channel text, p_update_id text, p_now timestamptz
) returns boolean language plpgsql security definer set search_path = public as $$
declare before boolean;
begin
  perform msg_check(p_secret);
  before := exists (
    select 1 from seen_updates where channel = p_channel and update_id = p_update_id
  );
  insert into seen_updates (channel, update_id, at)
  values (p_channel, p_update_id, p_now) on conflict do nothing;
  return before;
end $$;

create function msg_message_add(p_secret text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  perform msg_check(p_secret);
  insert into messages (
    conversation, direction, kind, content, answers, channel_id, at,
    status, error, context
  ) values (
    (p_row->>'conversation')::uuid, p_row->>'direction', p_row->>'kind',
    p_row->'content', (p_row->>'answers')::uuid, p_row->>'channelId',
    (p_row->>'at')::timestamptz, p_row->>'status', p_row->>'error',
    -- A JSON null context is no context, the same as a missing one.
    nullif(p_row->'context', 'null'::jsonb)
  ) returning * into m;
  update conversations set last_message_at = m.at where id = m.conversation;
  return msg_message_json(m);
end $$;

create function msg_message_get(p_secret text, p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select msg_message_json(m) from messages m where m.id = p_id
$$;

create function msg_messages(p_secret text, p_conversation uuid)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(msg_message_json(m) order by m.at, m.seq), '[]'::jsonb)
  from messages m where m.conversation = p_conversation
$$;

create function msg_message_by_channel_id(
  p_secret text, p_conversation uuid, p_channel_id text
) returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select msg_message_json(m) from messages m
  where m.conversation = p_conversation and m.channel_id = p_channel_id
  order by m.seq limit 1
$$;

-- The one place the forward-only rule lives in SQL; mayAdvance() in the
-- package is its twin, and the contract tests keep them the same.
create function msg_may_advance(p_from text, p_to text) returns boolean
language sql immutable as $$
  with ranks as (
    select * from (values ('queued', 1), ('sending', 2), ('sent', 3),
                          ('delivered', 4), ('read', 5), ('replied', 6)) r(s, n)
  )
  select case
    when p_from is null then false
    when p_from in ('failed', 'unknown', 'cancelled') then false
    when p_to = 'cancelled' then p_from = 'queued'
    when p_to in ('failed', 'unknown') then p_from in ('queued', 'sending')
    when p_from = 'sending' and p_to = 'queued' then true
    else coalesce((select n from ranks where s = p_to), 0)
         > coalesce((select n from ranks where s = p_from), 0)
  end
$$;

create function msg_message_advance(
  p_secret text, p_id uuid, p_status text,
  p_channel_id text default null, p_error text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare m messages;
begin
  perform msg_check(p_secret);
  select * into m from messages where id = p_id for update;
  if m.id is null or not msg_may_advance(m.status, p_status) then
    return false;
  end if;
  update messages set
    status = p_status,
    channel_id = coalesce(p_channel_id, channel_id),
    error = coalesce(p_error, error)
  where id = p_id;
  return true;
end $$;

create function msg_messages_waiting(p_secret text, p_conversation uuid, p_context jsonb)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(msg_message_json(m) order by m.at, m.seq), '[]'::jsonb)
  from messages m
  where m.conversation = p_conversation and m.status = 'queued'
    and m.context is not distinct from nullif(p_context, 'null'::jsonb)
$$;

create function msg_messages_purge(p_secret text, p_before timestamptz)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform msg_check(p_secret);
  delete from messages where at < p_before;
  get diagnostics n = row_count;
  return n;
end $$;

create function msg_outbox_enqueue(p_secret text, p_message uuid, p_at timestamptz)
returns void language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  insert into outbox (message, conversation, at, attempts, next_try)
  select m.id, m.conversation, p_at, 0, p_at from messages m where m.id = p_message
  on conflict (message) do update set at = excluded.at, next_try = excluded.next_try,
    attempts = 0, locked_until = null
$$;

-- Due rows, at most one per conversation, none for a conversation whose row
-- someone still holds. The update re-checks its row after a lock, so two
-- claims at once never both take one (ADR 0031).
create function msg_outbox_claim(p_secret text, p_now timestamptz, p_until timestamptz)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  with held as (
    select conversation from outbox
    where locked_until is not null and locked_until > p_now
  ), picked as (
    select distinct on (conversation) message from outbox
    where next_try <= p_now and conversation not in (select conversation from held)
    order by conversation, at, message
  ), taken as (
    update outbox o set locked_until = p_until
    from picked p
    where o.message = p.message and (o.locked_until is null or o.locked_until <= p_now)
    returning o.message, o.conversation, o.attempts, o.at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'message', message, 'conversation', conversation, 'attempts', attempts
  ) order by at, message), '[]'::jsonb) from taken
$$;

create function msg_outbox_retry(
  p_secret text, p_message uuid, p_next_try timestamptz, p_attempts int
) returns void language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  update outbox set next_try = p_next_try, attempts = p_attempts, locked_until = null
  where message = p_message
$$;

create function msg_outbox_dequeue(p_secret text, p_message uuid)
returns void language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  delete from outbox where message = p_message
$$;

-- Only the anonymous role, the Worker's publishable key, may call these; the
-- secret inside each is what actually guards them. Supabase has the roles;
-- a plain Postgres, as in CI, gets them made.
do $$
declare f text;
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'msg\_%'
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
