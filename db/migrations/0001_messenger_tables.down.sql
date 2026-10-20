-- Undoes 0001: the messenger's tables. pgcrypto stays: Supabase ships it.
drop table if exists seen_updates;
drop table if exists outbox;
drop table if exists messages;
drop table if exists conversations;
drop table if exists api_secrets;
