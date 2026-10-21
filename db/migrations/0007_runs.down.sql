-- Undoes 0007: runs, and the household's switch.
drop function if exists hh_bot_off(text, uuid, boolean);
drop function if exists runs_expired(text, timestamptz);
drop function if exists runs_due(text, timestamptz);
drop function if exists run_commit(text, text, int, jsonb, jsonb, timestamptz);
drop function if exists run_claim(text, text, text, int, timestamptz, timestamptz);
drop function if exists runs_open(text, uuid);
drop function if exists run_conversations(text, text);
drop function if exists run_get(text, text);
drop function if exists run_create(text, jsonb);
drop function if exists run_members(runs);
drop function if exists run_json(runs);
drop table if exists runs;
alter table households drop column if exists bot_off;
