# 0030. Keep every secret only in Cloudflare, saved from the owner's laptop, never read back

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** Mayur

## Context

The API now needs values that let someone act as us or spend our money: the Gemini key ([0028](0028-receipt-photos-ai.md)), the Telegram bot token, the secret Telegram must send with every update, and the Supabase URL and publishable key ([0025](0025-server.md)). More will come.

Everything about this project leaks by default. The repo is public. Agents write most of the code, in chats whose transcripts a third company keeps. GitHub Actions logs are readable by anyone who can read the repo. A value that touches any of those has to be treated as stolen.

Until 18 October the only guidance was a runbook line: paste the key into Cloudflare's dashboard and nowhere else. On 18 and 19 October the owner set up the first four secrets with a script ([#198](https://github.com/mdrepo/cookto.day/issues/198)) and a health check that tells whether each works ([spec #202](../../specs/202-keys-health.md)). Nothing recorded why it works this way, so nothing stops a later PR from passing a key through GitHub "for convenience".

## Decision

**A secret lives in exactly one place: a secret on the `cookto-day` Worker.** Not in the repo, `wrangler.jsonc`, a `.env` file, GitHub's secrets, a workflow log, an issue, a runbook or a chat. The one exception is `CLOUDFLARE_API_TOKEN` in GitHub, which deploys ([0017](0017-solo-owner-merge.md)); it can write Worker secrets but never read one.

**A setting is not a secret.** A value that would do no harm published (`RECEIPT_PHOTOS`, `RECEIPT_MODEL`) is a `var` in `wrangler.jsonc`, changed by a PR, where its history is reviewable. A value that lets someone act as us, read our users' data or spend our money is a secret. The Supabase URL and publishable key are built to be public, but they are saved as secrets too, so there is one list of what the Worker is given; that changes only when the app in the browser needs them.

**Only the owner saves a secret, from their laptop, with `apps/api/scripts/secret.sh`.** The script reads a file outside the repo, checks each value's shape, saves it with `wrangler secret put`, then blanks the file so the laptop keeps no copy. Cloudflare's dashboard is the fallback. An agent never holds, asks for or echoes a value; the owner never pastes one into a chat. If a value is pasted anywhere else by mistake, it is revoked at its source and saved again.

**Write-only.** Nothing reads a secret back, and no script prints one. The only check is the Worker asking each service a free question, `GET /api/health/keys`, which answers `ok`, `rejected`, `missing` or `unreachable`, never a value.

**In code, a secret is read from `env` at the edge, by one holder.** Each secret has one adapter that receives it and sends it only the way its service expects: a header or the URL. It is never logged (`log.ts` takes codes and numbers) and never part of an answer. A missing secret turns its feature off (503 or `missing`); it never crashes the Worker.

**Rotate by saving again; revoke at the source first.** `secret put` makes a new version and deploys it. When a value leaks, revoke it where it was issued (BotFather `/revoke`, Google's console, Supabase), then save the new one. Deleting a secret in Cloudflare is the emergency stop for its feature, and a deploy never brings it back.

**The names are listed in two places and nowhere else:** `Env` in `apps/api/src/index.ts` and `NAMES` in the script. Adding a secret touches both, its runbook, and the health check when a service can be asked.

**Local development runs without secrets:** features off, the health check says `missing`. A developer who needs one locally puts it in `.dev.vars`, which Wrangler reads and git ignores; it is never committed.

**Checked by:** gitleaks over every commit in CI ([0005](0005-supply-chain-policy.md)); ESLint, which allows `fetch` only in the network adapter and `console` only in `log.ts`; `secret.sh`'s shape check; and the health check after each save.

## Alternatives

- **GitHub Actions secrets, written to the Worker at deploy:** two copies, one of them readable to anyone with admin on the repo, re-sent on every deploy, and one agent-written workflow change away from a log line. Rejected.
- **A `.env` or `.dev.vars` file on the laptop as the record:** a copy that outlives the paste, in backups and in shell completion. The script's file is blanked after each save for this reason.
- **A secrets manager (1Password, Doppler, Cloudflare Secrets Store):** another account, another sync, and the Worker still ends up with a copy. Secrets Store is account-wide and a Worker can bind to it; worth it when a second Worker or a staging environment needs the same values. Not now.
- **Supabase Vault:** the Worker would fetch its secrets on every cold start: a second hop and a second place.
- **Encrypted in the repo (sops, age):** the decryption key becomes the secret, and the repo is public.
- **Hidden paste in the terminal (the script's first version):** kept the value out of history as well, but the owner preferred editing a file and running one command.

## Consequences

- There is no copy anywhere but Cloudflare. If the Cloudflare account were lost, every key is re-issued at its service, not recovered.
- Every save deploys a new Worker version. It happens rarely, by the owner, and the script checks that the site still answers.
- An agent can build a feature that needs a key without ever seeing one: it reads `env`, writes the health question, and the owner saves the value.
- Revisit when a second Worker or environment needs the same secrets (Secrets Store), or when a second owner may save them.
