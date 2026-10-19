# Runbook: the database

How the database changes, and the two one-time steps that let you run those changes ([ADR 0032](../adr/0032-sql-migrations.md)). A code owner does this; an agent writes migrations and never runs them.

## Once: psql and the connection string

1. `brew install libpq`. It's keg-only; the script finds it at `/opt/homebrew/opt/libpq/bin/psql`.
2. In Supabase, **Connect** at the top of the project → **Session pooler** → copy the URI. The session pooler, not the direct connection (IPv6 only) and not the transaction pooler (bad for migrations).
3. Save it in the keychain. It prompts; paste the URI and press Enter. Nothing echoes.

   ```sh
   security add-generic-password -a cookto.day -s cookto.day-db -w
   ```

   To check, without printing it: `security find-generic-password -s cookto.day-db > /dev/null && echo saved`.

## Every change

```sh
sh db/scripts/migrate.sh status      # what's applied, what's waiting
sh db/scripts/migrate.sh up          # apply what's waiting, in order
sh db/scripts/migrate.sh down        # roll the latest one back; `down 2` the last two
```

Run `up` before merging the code PR that needs the change, and `down` before reverting it. Each migration runs in one transaction with its row in `schema_migrations`; a failure leaves the database as it was.

An agent adds one with `sh db/scripts/migrate.sh new <name>`, which writes both files; CI refuses an up without a down, applies everything up on a throwaway Postgres, runs the stores' contract tests, rolls everything down, and checks nothing is left.

## Once: the Worker's secret for the functions

The Worker reaches Postgres with the publishable key, which is public by nature, so every function also checks a secret only the Worker holds ([ADR 0031](../adr/0031-messenger.md)). After the first `up`:

```sh
sh db/scripts/migrate.sh secret
```

It makes a random value, stores its hash in the database, and saves the value as the Worker secret `MESSENGER_API_SECRET` ([ADR 0030](../adr/0030-secrets-only-in-cloudflare.md)). Run it again to rotate; nothing else to change.

## Stop it

- **Stop the messenger's functions:** `delete from api_secrets where name = 'messenger'` in the SQL editor, or `migrate.sh secret` with a new value the Worker doesn't have yet. Every call answers "messenger-secret" until the secret is saved again.
- **Undo a migration:** `migrate.sh down`. A rollback that would lose data is written up in its PR first.
