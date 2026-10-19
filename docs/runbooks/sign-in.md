# Runbook: sign-in with Google

How to set up sign-in ([ADR 0025](../adr/0025-server.md), [spec #150](../../specs/150-sign-in-google.md)). A code owner does these steps; an agent never holds a key or a secret, and none goes in the repo, GitHub or a chat.

## 1. A Supabase project (once)

1. In [Supabase](https://supabase.com/dashboard), create a project named `cookto-day`, region **Singapore**, on the free plan. Keep the database password in your password manager.
2. A free project pauses after a week with no use. Daily use keeps it awake; if it pauses, press **Restore** in the dashboard.
3. The free plan has no backups. Phones keep their own copy of the kitchen, so a loss would hurt but wouldn't wipe a family's data.

## 2. A Google sign-in client (once)

Use the same billed Google Cloud project as the Gemini key ([receipt-photos.md](receipt-photos.md)).

1. In the Cloud console, **APIs & Services → OAuth consent screen**: app name `cookto.day`, user type **External**, your email as support and developer contact, scopes `openid`, `email` and `profile` only. Publish it, so anyone can sign in.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**:
   - Authorised JavaScript origins: `https://cookto.day`
   - Authorised redirect URIs: the one Supabase shows under **Authentication → Providers → Google** (it ends in `/auth/v1/callback`)
3. Copy the client ID and client secret.

## 3. Join them (once)

1. In Supabase, **Authentication → Providers → Google**: turn it on, paste the client ID and secret, save.
2. **Authentication → URL Configuration**: Site URL `https://cookto.day`, and add `https://cookto.day/api/auth/callback` to the redirect URLs.

## 4. Give the API what it needs (once)

Two secrets, from the project's **Project Settings → API** page: `SUPABASE_URL`, the project's URL, and `SUPABASE_ANON_KEY`, the `anon` (or "publishable") key. Put them on their lines in `~/.config/cookto.day/secrets.env` and run the script, which checks each looks right, saves it, and blanks the file again (`bunx wrangler@4.147.0 login` once first; [telegram.md](telegram.md) explains the file):

```sh
sh apps/api/scripts/secret.sh
```

The dashboard works too: **Workers & Pages → cookto-day → Settings → Variables and Secrets**, type **Secret**.

Never the `service_role` key: the API acts with each person's own session, so row-level security applies (ADR 0025).

## 5. Check it

After the sign-in PR deploys: open cookto.day on your phone, Settings, **Continue with Google**. You should come back signed in. Try it once in the installed app on an iPhone too.

## Stop it

To stop all sign-ins at once, turn the Google provider off in Supabase. People stay signed out; the app works on their phones as before.
