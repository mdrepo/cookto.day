-- Undoes 0010: start in Telegram. The session function as 0009 made it:
-- none for someone never signed in.
drop function if exists auth_account_of(text, text, text);
drop function if exists auth_telegram_session(text, text, text, text, timestamptz);

create function auth_telegram_session(p_secret text, p_channel text, p_user_id text, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  acct uuid;
  who text;
  token text;
begin
  perform msg_check(p_secret);
  select account, name into acct, who from identities
    where channel = p_channel and user_id = p_user_id;
  if acct is null then return null; end if;
  token := encode(gen_random_bytes(32), 'hex');
  insert into sessions (hash, account, created_at, last_used_at)
    values (encode(digest(token, 'sha256'), 'hex'), acct, p_now, p_now);
  return jsonb_build_object('name', who, 'session', token);
end $$;

revoke all on function auth_telegram_session(text, text, text, timestamptz) from public;
grant execute on function auth_telegram_session(text, text, text, timestamptz) to anon, authenticated;
