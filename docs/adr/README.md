# Architecture Decision Records

Each file records one decision: the context, what we chose, what we rejected and why. `AGENTS.md` states each rule in a line; the ADR says why, so nobody "fixes" it away.

## Rules

- **Accepted ADRs are binding.** Humans and AI agents follow them. Do not "improve" a decision away in a PR.
- **To change a decision, write a new ADR** that supersedes the old one, and get it approved by a code owner. Set the old ADR's status to `Superseded by NNNN`. Never edit the Decision section of an accepted ADR. CI enforces this (`checkAdrChange` in `scripts/pr-rules.ts`).
- Notes can be added to an accepted ADR outside its Decision section, for example `## Implementation notes (date)`.
- Numbers are never reused. Superseded ADRs stay in the folder.
- Keep each ADR to about one page. Use [`template.md`](template.md).

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-tdd-workflow.md) | TDD workflow: Spec → Red → Green → Refactor → Verify | Accepted |
| [0003](0003-testing-policy.md) | Testing policy: e2e for behaviour, DOM tests of our own page, unit tests for pure functions | Accepted |
| [0004](0004-e2e-runs-locally.md) | Playwright runs locally and in pre-push, offline, not in CI | Accepted |
| [0005](0005-supply-chain-policy.md) | Supply-chain policy: no runtime dependencies | Accepted |
| [0006](0006-dependency-health-check.md) | Dependency allowlist and health thresholds | Accepted |
| [0007](0007-lint-format-tooling.md) | Lint and format: ESLint + typescript-eslint + Prettier, TypeScript 6 | Accepted |
| [0008](0008-git-hooks-without-dependencies.md) | Git hooks without dependencies, Conventional Commits | Accepted |
| [0009](0009-squash-merge.md) | Squash-merge; merging never deploys | Superseded by 0014 |
| [0010](0010-agents-md-single-source.md) | AGENTS.md as the single source of agent guidance | Accepted |
| [0011](0011-design-guide-and-check.md) | A design guide, enforced by a check with a ratchet | Accepted |
| [0012](0012-localisation.md) | Localisation: every string in one place, right to left by default | Accepted |
| [0013](0013-static-browser-only.md) | Static and browser-only: no server, data stays on the device | Accepted |
| [0014](0014-deploy-on-merge.md) | Squash-merge; every merge to main deploys, after the gates | Accepted |
| [0015](0015-kitchen-packs.md) | Keep the engine generic; each kitchen's food culture lives in data packs | Proposed |
