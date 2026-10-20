-- Undoes 0006: the household's second half.
drop function if exists hh_housekeeping(text, timestamptz);
drop function if exists sync_changes(text, uuid, bigint, int);
drop function if exists sync_push(text, uuid, jsonb, timestamptz);
drop function if exists hh_account_delete(text, uuid);
drop function if exists hh_cooks(text, uuid, timestamptz);
drop function if exists hh_member_remove(text, uuid, uuid);
