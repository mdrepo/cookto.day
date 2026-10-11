# 0016. One repository, split into workspaces; CI runs what a change affects

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** Mayur

## Context

cookto.day is growing past one static page: a plan engine, a design kit with screenshot tests, kitchen packs written by people who aren't developers ([0015](0015-kitchen-packs.md)), an API later, and perhaps Android and iOS apps after that. In one flat folder, every change runs every check. A home cook fixing a dish name waits for the browser tests; an agent changing a colour reruns the PR-rule tests. On a public repo GitHub's runners are free, so the cost isn't money, it's how long an agent or a contributor waits to learn they broke something.

This repo is also a boilerplate other people clone. Whatever we build, they inherit and maintain. So we prefer a well-maintained tool to code of our own, as long as the tool never ships to users ([0005](0005-supply-chain-policy.md) still holds for everything that does).

## Decision

- **One repository, Bun workspaces.** Each workspace has its own `package.json` (`@cookto/<name>`), and depends on another only through `workspace:*`.

  | Workspace | What | Depends on |
  |---|---|---|
  | `apps/web` | The site: pages, i18n, e2e, DOM and size-budget tests, `wrangler.jsonc` | engine, design |
  | `packages/engine` | Planning, ranking, expiry: pure TypeScript, no DOM, storage or network | packs (types only) |
  | `packages/design` | Tokens, styles, UI primitives, the kit page, screenshot tests | — |
  | `packs` | Kitchen packs and `packs:check` | — |
  | `tooling` | The repo-wide check scripts and their tests (today's `scripts/`) | — |

- **No package until it earns one.** A new workspace needs a second user of its code (another app) or its own checks and reviewers, and an ADR for an app. `apps/api`, `apps/android` and `apps/ios` arrive with their own ADRs. Strings stay in `apps/web` until another app needs them.
- **The rules stay at the root:** one `AGENTS.md` ([0010](0010-agents-md-single-source.md)), `DESIGN.md`, `docs/adr/`, `specs/`, the git hooks, the lint, format and type base configs, one `bun.lock` and one `dependency-allowlist.json`, which covers every workspace's `package.json`.
- **Turborepo runs the tasks** (`turbo.json`), as a dev dependency that goes through the allowlist and health check like any other ([0006](0006-dependency-health-check.md)). No remote cache, and telemetry is turned off in CI and the hooks.
- **PRs run what they affect.** CI is one job, `turbo run check test build --affected`, and that job is the required check. A change to anything at the root (`bun.lock`, configs, `turbo.json`, `tooling`, `.github`) counts as affecting every workspace.
- **Some checks are never "affected":** secrets, commit and PR rules, the allowlist, agent files and ADR edits run on every PR.
- **`main` runs everything.** The deploy ([0014](0014-deploy-on-merge.md)) runs every task, not only affected ones, so a mistake in the dependency graph is caught before it ships.
- **Protection follows the files.** CODEOWNERS and `.claude/settings.json` guard each workspace's tests, configs and `package.json` (`**/test/`, `**/e2e/`, `**/package.json`, and so on). A check fails if a workspace has a test or config path that isn't code-owned.

## Alternatives

- **Stay flat, filter CI by folder:** no new tool, but the filters are a hand-kept list that drifts from the real dependencies, and a missed one skips a check that should have run.
- **Our own `affected.ts`:** about a hundred lines, but ours to maintain forever, in every clone.
- **Nx:** does the same and more, with more config and plugins than this repo needs.
- **Separate repositories:** one change across the engine and the app becomes two PRs and a release; much harder to clone as one boilerplate.

## Consequences

- A pack fix runs only the pack checks; a colour change runs design and web; the engine is tested alone, with no UI.
- An app for Android or iOS is a new folder and an ADR, not a new repo.
- `tdd:verify`, the size budget, `design:check`, knip and the allowlist check must learn about workspaces. That's the real work of the move.
- Files move. Links to them break, including the boilerplate article on mayurdube.com, which links to files here. The move's PR lists the moved paths, and the article is updated in step.
- Revisit if Turborepo stops passing the health check, or if CI is still slow with affected runs.
