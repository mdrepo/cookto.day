# Architecture Decision Records

Each file records one decision: the context, what we chose, what we rejected and why. `AGENTS.md` states each rule in a line; the ADR says why, so nobody "fixes" it away.

## Rules

- **Accepted ADRs are binding.** Humans and AI agents follow them. Do not "improve" a decision away in a PR.
- **To change a decision, write a new ADR** that supersedes the old one, and get it approved by a code owner. Set the old ADR's status to `Superseded by NNNN`. Never edit the Decision section of an accepted ADR. CI enforces this (`checkAdrChange` in `tooling/scripts/pr-rules.ts`).
- Notes can be added to an accepted ADR outside its Decision section, for example `## Implementation notes (date)`.
- Numbers are never reused. Superseded ADRs stay in the folder.
- Keep each ADR to about one page. Use [`template.md`](template.md).

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-tdd-workflow.md) | TDD workflow: Spec → Red → Green → Refactor → Verify | Accepted |
| [0003](0003-testing-policy.md) | Testing policy: e2e for behaviour, DOM tests of our own page, unit tests for pure functions | Accepted |
| [0004](0004-e2e-runs-locally.md) | Playwright runs locally and in pre-push, offline, not in CI | Superseded by 0021 |
| [0005](0005-supply-chain-policy.md) | Supply-chain policy: no runtime dependencies | Superseded by 0018 |
| [0006](0006-dependency-health-check.md) | Dependency allowlist and health thresholds | Accepted |
| [0007](0007-lint-format-tooling.md) | Lint and format: ESLint + typescript-eslint + Prettier, TypeScript 6 | Accepted |
| [0008](0008-git-hooks-without-dependencies.md) | Git hooks without dependencies, Conventional Commits | Accepted |
| [0009](0009-squash-merge.md) | Squash-merge; merging never deploys | Superseded by 0014 |
| [0010](0010-agents-md-single-source.md) | AGENTS.md as the single source of agent guidance | Accepted |
| [0011](0011-design-guide-and-check.md) | A design guide, enforced by a check with a ratchet | Accepted |
| [0012](0012-localisation.md) | Localisation: every string in one place, right to left by default | Accepted |
| [0013](0013-static-browser-only.md) | Static and browser-only: no server, data stays on the device | Superseded by 0025 |
| [0014](0014-deploy-on-merge.md) | Squash-merge; every merge to main deploys, after the gates | Superseded by 0017 |
| [0015](0015-kitchen-packs.md) | Keep the engine generic; each kitchen's food culture lives in data packs | Accepted |
| [0016](0016-monorepo.md) | One repository, split into workspaces; CI runs what a change affects | Accepted |
| [0017](0017-solo-owner-merge.md) | CI can't be skipped; while there's one owner, a PR needs no approval; agents merge only when told | Accepted |
| [0018](0018-ui-react.md) | Build the UI with React, cache it for good, and budget our own code | Accepted |
| [0019](0019-design-system.md) | Build the UI from one design system in five layers, each checked by a script | Accepted |
| [0020](0020-icons-lucide.md) | Draw icons from Lucide, through one Icon component | Accepted |
| [0021](0021-test-every-engine.md) | Test on an Android phone, an iPhone and a desktop, offline in every browser | Accepted |
| [0022](0022-app-layers.md) | Split the app into screens, screen hooks, use cases and data, with imports checked | Accepted |
| [0023](0023-state-and-rerenders.md) | Keep each kind of state in one place, and test what re-renders | Accepted |
| [0024](0024-data-layer.md) | Read and write all data through one data layer that cancels stale work | Accepted |
| [0025](0025-server.md) | Add login, sync and bill forwarding through our own API, on Supabase | Accepted |
| [0026](0026-meals-belong-to-people.md) | Meal slots belong to people, and shops to where the household lives | Accepted |
| [0027](0027-pantry-and-cuisine-packs.md) | Keep amounts and condition in the pantry, and let a household load cuisine packs | Proposed |
| [0028](0028-receipt-photos-ai.md) | Read receipt photos with Gemini Flash-Lite, only through our API, within hard limits | Accepted |
| [0029](0029-owner-is-product-manager.md) | The owner is the product manager; agents build and merge inside gates that check judgment, not only form | Proposed |
| [0030](0030-secrets-only-in-cloudflare.md) | Keep every secret only in Cloudflare, saved from the owner's laptop, never read back | Accepted |
| [0031](0031-messenger.md) | One messenger package sends, receives and records every message, in Postgres, through an outbox; Telegram first | Proposed |
| [0032](0032-sql-migrations.md) | Change the database only by numbered SQL migrations, each with a rollback, run by a script from the owner's laptop | Proposed |
| [0033](0033-telegram-sign-in-and-households.md) | Sign in with Telegram, and a household's plan lives on the server, with every phone keeping a copy | Proposed |
| [0034](0034-workflows-and-templates.md) | Run the bot's conversations as workflows: steps in TypeScript, every word a template, runs as rows | Proposed |
