# 0014. Squash-merge; every merge to main deploys, after the gates

- **Status:** Superseded by 0017
- **Date:** 2026-10-10
- **Deciders:** Mayur
- **Supersedes:** [0009](0009-squash-merge.md)

## Context

[0009](0009-squash-merge.md) said merging never deploys: a person starts every deploy. That came from a service with paying customers and a team. cookto.day is a free static site with one owner. A deploy only replaces files on a CDN, rolling back is one more merge, and nothing on the site holds user data (it stays on the device, [0013](0013-static-browser-only.md)). A manual step here protects nothing; it only means fixes sit on `main` unshipped.

What still matters is that nobody can ship by accident or around the checks.

## Decision

- PRs are merged with **squash-merge only**. Merge commits and rebase-merge are disabled in the repository settings.
- The **PR title** must follow Conventional Commits, because it becomes the commit message on `main`. CI checks the title.
- Branch commits still follow Conventional Commits (the `commit-msg` hook, and CI), because the TDD rules read the `test:` commits.
- `main` is protected: CI and one code owner's approval are required, approvals are dismissed by new commits, and force-pushes are blocked.
- **Every merge to `main` deploys** to https://cookto.day through `.github/workflows/deploy.yml`, and nothing else deploys: no deploys from a laptop.
- The deploy runs `bun run check`, the e2e tests and the build on the merged code first. If any fails, nothing is deployed.
- Wrangler is pinned to a release at least 7 days old ([0005](0005-supply-chain-policy.md)) and runs only in that workflow. The Cloudflare API token is a GitHub secret scoped to this one Worker and zone.
- `wrangler.jsonc` and the deploy workflow are code-owned.

## Alternatives

- **Keep deploys manual ([0009](0009-squash-merge.md)):** the right call with customers and a team; here it only delays fixes.
- **Cloudflare's Git integration (Workers Builds):** no token in GitHub, but the deploy runs outside the repo's checks and isn't visible in its history.
- **Preview deploys for every PR:** useful later; not needed for one owner.

## Consequences

- What's on `main` is what's live, minutes after the merge.
- The e2e tests now also run in CI, but only as the deploy gate. PRs still rely on the pre-push hook ([0004](0004-e2e-runs-locally.md)).
- A bad merge reaches users. The fix is a revert PR, which deploys the same way.
