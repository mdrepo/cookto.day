# 0032. Change the database only by numbered SQL migrations, each with a rollback, run by a script from the owner's laptop

- **Status:** Proposed
- **Date:** 2026-10-19
- **Deciders:** Mayur

## Context

[0025](0025-server.md) chose Supabase Postgres and said "plain SQL migrations, which any Postgres host runs", in `supabase/migrations`, with row-level security on every table and a check that fails without it. No migration exists yet. The messenger ([0031](0031-messenger.md)) brings the first tables, and the owner asked for a database whose tables and rollbacks are managed through scripts, not by hand in a dashboard.

Constraints: agents write most changes but must never hold a credential ([0030](0030-secrets-only-in-cloudflare.md)); the database password is a secret of the laptop, never of the Worker or GitHub; Supabase's CLI applies migrations but has no rollbacks; and the repo takes no dependency it doesn't need.

## Decision

**Every change to the database is a numbered migration in `db/migrations/`, with a rollback.** `0001_messenger.up.sql` and `0001_messenger.down.sql`: the down undoes exactly what the up did, nothing more. Plain SQL, no tool-specific syntax, so any Postgres host runs it.

**One script runs them, `db/scripts/migrate.sh`,** on the owner's laptop with `psql`:

- `up` applies every migration not yet applied, in order, each in a transaction; `down [n]` rolls back the latest one, or the last n; `status` lists what's applied and what's waiting; `new <name>` writes both files from a template, so a rollback is never forgotten.
- A table, `schema_migrations`, records each applied number and when.
- The connection string comes from the macOS keychain, stored once with `security add-generic-password`, read by the script, never from a file, the repo, an environment file or Cloudflare. The script refuses to run if it's missing.

**Only the owner runs it.** Agents write migrations and never run them; they have no connection string. The owner runs `up` before merging the code that needs the change, and `down` before reverting it. The runbook is `docs/runbooks/database.md`.

**Rules a migration follows, checked in CI:**

- every `up` has a `down`, and a migration already on `main` is never edited; a fix is the next number;
- every new table turns row-level security on in the same migration, and starts with no policy, so nothing can read it until a policy or a function allows it;
- a function the Worker calls is `security definer` with `search_path` set, and `execute` is revoked from `public` before it's granted to the one role that needs it;
- CI starts a throwaway Postgres in the job, applies every migration up, runs the stores' contract tests against it, then rolls every migration down and checks that nothing is left: no table, no function, no type.

**Where the Worker's access lives:** in the migrations too. Policies and functions are schema, so they're versioned and rolled back with the tables they guard.

## Alternatives

- **Supabase's CLI and `supabase/migrations`:** applies forward only; no rollbacks, and it wants its own login and Docker for a local copy. Our files stay compatible with it in shape, in case it's useful later.
- **A migration tool (Prisma, Drizzle, Flyway, dbmate):** a dependency, and most generate SQL we'd rather read and write ourselves. `migrate.sh` is about forty lines.
- **The Worker migrates itself on deploy:** needs a privileged key in Cloudflare and removes the human gate from the one change that can't be undone by a redeploy.
- **Durable Object SQLite:** no rollbacks, no cross-object queries, and 0025 already chose Postgres for household data.
- **The connection string in the secrets file:** that file is blanked after each save; a migration needs it every time. The keychain is the laptop's own store for a credential used often.

## Consequences

- Schema changes are reviewable in PRs and reversible in one command.
- The owner is in the loop for every schema change, by design; nothing ships to the database by an agent's hand.
- CI proves each migration both ways, on a real Postgres, before it reaches main.
- The first migration is the messenger's; later ones are sign-in's and households'.
- Revisit when a second person runs migrations, or when a change can't be rolled back without losing data, which needs a written plan in the PR.
