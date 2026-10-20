-- #207, ADR 0031: the messenger's tables. Conversations, every message in
-- and out, the outbox of sends not yet made, the updates already seen, and
-- the one secret the Worker must show to call anything (ADR 0032).
-- Every table has row-level security on with no policy: nothing reads or
-- writes them but the functions in 0002, which check the secret.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table api_secrets (
  name text primary key,
  -- sha256 of the value, hex. The value itself lives only in Cloudflare.
  hash text not null
);
alter table api_secrets enable row level security;

create table conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  chat text not null,
  -- Whose it is: a link today, a household later (ADR 0031).
  owner_kind text not null,
  owner_id text not null,
  started_at timestamptz not null,
  last_message_at timestamptz,
  unique (channel, chat)
);
create index conversations_owner on conversations (owner_kind, owner_id);
alter table conversations enable row level security;

create table messages (
  id uuid primary key default gen_random_uuid(),
  -- Insertion order, for messages that share a time.
  seq bigint generated always as identity,
  conversation uuid not null references conversations (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  kind text not null,
  content jsonb not null,
  answers uuid references messages (id) on delete set null,
  channel_id text,
  at timestamptz not null,
  status text check (
    status in ('queued', 'sending', 'sent', 'delivered', 'read', 'replied',
               'failed', 'unknown', 'cancelled')
  ),
  error text,
  context jsonb
);
create index messages_in_order on messages (conversation, at, seq);
create index messages_by_channel_id on messages (conversation, channel_id);
alter table messages enable row level security;

create table outbox (
  message uuid primary key references messages (id) on delete cascade,
  conversation uuid not null references conversations (id) on delete cascade,
  at timestamptz not null,
  attempts int not null default 0,
  next_try timestamptz not null,
  locked_until timestamptz
);
create index outbox_due on outbox (next_try);
alter table outbox enable row level security;

create table seen_updates (
  channel text not null,
  update_id text not null,
  at timestamptz not null,
  primary key (channel, update_id)
);
alter table seen_updates enable row level security;
