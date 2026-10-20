-- Undoes 0005: households (0006 must be down first). Invite links go
-- first, so the purpose check can shrink back to 0004's.
drop function if exists hh_invite_start(text, text, text, text, text, text, timestamptz);
drop function if exists hh_invite(text, uuid, text, text, timestamptz);
drop function if exists hh_get(text, uuid);
drop function if exists hh_claim_cook(text, uuid, text, timestamptz);
drop function if exists hh_create(text, uuid, jsonb, timestamptz);
drop function if exists hh_take(uuid, jsonb, timestamptz);
drop function if exists hh_member_json(members);
drop function if exists hh_member_of(uuid);

delete from links where purpose = 'invite';
alter table links
  drop column if exists household,
  drop column if exists role,
  drop constraint links_purpose_check,
  add constraint links_purpose_check check (purpose in ('cook', 'sign-in'));

drop table if exists changes;
drop table if exists records;
drop table if exists members;
drop table if exists households;
