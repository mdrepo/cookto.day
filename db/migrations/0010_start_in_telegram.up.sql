-- #260: start in Telegram. Functions only, no tables. The page "Set up your
-- kitchen" opens makes the account of a Telegram user who has none, with
-- the identity a sign-in code's Start makes (0004), and the bot finds the
-- account behind a Start with no code (ADR 0032, 0033).

drop function auth_telegram_session(text, text, text, timestamptz);

create function auth_telegram_session(
  p_secret text, p_channel text, p_user_id text, p_name text, p_now timestamptz
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  acct uuid;
  who text;
  token text;
begin
  perform msg_check(p_secret);
  select account, name into acct, who from identities
    where channel = p_channel and user_id = p_user_id;
  if acct is null then
    insert into accounts (created_at) values (p_now) returning id into acct;
    insert into identities (channel, user_id, account, name, created_at)
      values (p_channel, p_user_id, acct, p_name, p_now);
    who := p_name;
  end if;
  token := encode(gen_random_bytes(32), 'hex');
  insert into sessions (hash, account, created_at, last_used_at)
    values (encode(digest(token, 'sha256'), 'hex'), acct, p_now, p_now);
  return jsonb_build_object('name', who, 'session', token);
end $$;

create function auth_account_of(p_secret text, p_channel text, p_user_id text)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform msg_check(p_secret);
  return (select account::text from identities
    where channel = p_channel and user_id = p_user_id);
end $$;

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('auth_telegram_session', 'auth_account_of')
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
