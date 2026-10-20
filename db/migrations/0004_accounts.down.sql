-- Undoes 0004: sign-in. msg_link_connect goes back to 0003's body.
drop function if exists auth_housekeeping(text, timestamptz);
drop function if exists auth_session_end(text, text);
drop function if exists auth_session(text, text, timestamptz);
drop function if exists auth_claim(text, text, timestamptz);
drop function if exists auth_start(text, text, text, text, text, timestamptz);
drop function if exists auth_link_make(text, text, timestamptz);

create or replace function msg_link_connect(
  p_secret text, p_code text, p_channel text, p_chat text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l links;
  c jsonb;
begin
  perform msg_check(p_secret);
  select * into l from links where code = upper(replace(p_code, '-', '')) for update;
  if l.code is null or l.used_at is not null or l.expires_at < p_now then
    return jsonb_build_object('ok', false);
  end if;
  c := msg_conversation_open(p_secret, p_channel, p_chat, 'link', l.token_hash, p_now);
  update links set used_at = p_now, conversation = (c->>'id')::uuid where code = l.code;
  return jsonb_build_object('ok', true, 'conversation', c);
end $$;

alter table links
  drop column if exists session_issued_at,
  drop column if exists account,
  drop column if exists purpose;
drop table if exists sessions;
drop table if exists identities;
drop table if exists accounts;
