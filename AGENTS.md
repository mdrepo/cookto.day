# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Antigravity) and the people driving them. This is the single source of agent rules ([ADR 0010](docs/adr/0010-agents-md-single-source.md)): tool-specific files only point here.

The person asking you for a change may not be able to judge a technical decision. So don't present options and wait for them to choose: follow the rules here. When the rules don't settle something, **stop and say what a code owner needs to decide** (see "Stop and ask" below).

## What this is

cookto.day is a free, static web app that runs entirely in the browser: no server, no accounts. People in India and Dubai add their grocery bills (quick-commerce invoice PDFs first), the app keeps their fridge and pantry, and suggests what to cook today from the household's own dishes: first the ones that use what's about to go off, then the ones they have everything for (or are one item short of, which goes on the shopping list), skipping what they cooked recently. It speaks English, Hindi, Marathi and Arabic (right to left), and prices in ₹ and AED.

Everything stays in the browser (`localStorage` / IndexedDB). Nothing is uploaded ([ADR 0013](docs/adr/0013-static-browser-only.md)).

## Map

One repository, split into workspaces ([ADR 0016](docs/adr/0016-monorepo.md)). Rules, decisions and specs live at the root; code lives in a workspace.

| Path | What |
|---|---|
| `apps/web/src/index.html` | The page shell. Apps have no CSS of their own: screens are layouts and parts from `@cookto/ui` (ADR 0019) |
| `packages/ui/tokens/` | The design tokens: colours, type, corners, spacing. `bun run tokens` writes the CSS and DESIGN.md's tables (ADR 0019) |
| `packages/ui/src/components/`, `layouts/` | The parts and layouts screens are built from, one folder each: code, CSS Module, kit examples. Tests in `packages/ui/test/`. Make one with `bun run new component` or `new layout` (ADR 0019) |
| `apps/kit/` | The kit page: every component in light and dark, English and Arabic, at cookto.day/kit/ (`bun run --cwd apps/kit dev`) |
| `apps/web/src/main.tsx`, `app.tsx` | The React app: `main.tsx` starts it, components render the screens ([ADR 0018](docs/adr/0018-ui-react.md)) |
| `apps/web/src/i18n/` | Every word the app shows, one file per language. `en.ts` defines the keys ([ADR 0012](docs/adr/0012-localisation.md)) |
| `apps/web/test/dom/`, `test/helpers/` | Our own built page in happy-dom ([ADR 0003](docs/adr/0003-testing-policy.md)) |
| `apps/web/test/budget/` | Page size budget: nothing from other sites |
| `apps/web/e2e/` | Playwright tests, named in the user's words. Selectors live only in `e2e/support/` |
| `apps/web/scripts/` | The build and the dev server |
| `packages/engine/` | Pure functions (dates, ranking, planning): no DOM, storage or network. Unit tests in its `test/` |
| `tooling/` | The checks (`scripts/`) and their tests (`test/`) |
| `specs/` | Acceptance criteria, one file per issue |
| `DESIGN.md` | How every screen looks. You don't decide the look; this file or a code owner does |
| `docs/adr/` | Decisions. **Accepted ADRs are binding** |
| `docs/workflow.md` | The workflow for the person driving you, with a worked example |

Outside packages are declared only in the root `package.json`. A workspace depends on another with `"workspace:*"`.

## Commands

```sh
bun install            # also turns on the git hooks
bun run dev            # build the web app, then serve it on http://localhost:3000
bun run build          # the static site, into apps/web/dist/
bun run new component <Name>  # a new part in packages/ui, with every file it needs
bun run new layout <Name>     # a new layout, the same way
bun run check          # everything CI checks: allowlist, agent files, design, file sizes, Prettier, knip, and every workspace's types, ESLint and tests
bun run check:affected # the same, but only the workspaces your branch affects (what CI runs on a PR)
bun run test           # every workspace's unit and DOM tests (not a bare `bun test`)
bun run e2e            # browser tests (CI does not run these on PRs; you must)
bun run tdd:verify     # proves your new tests fail on main and pass on your branch
bun run format         # fix formatting
```

## How every change is made

Every behaviour change follows the TDD workflow in [ADR 0002](docs/adr/0002-tdd-workflow.md). **Use the `tdd-change` skill** for the steps. In short:

0. **Spec:** every change starts from a GitHub issue. Write `specs/<issue>-<name>.md` (Given/When/Then) in a PR of its own. **Then stop.** A code owner merging that PR is the approval.
1. **Red:** one e2e test per criterion (in `apps/web/e2e/`), plus unit tests for new pure functions (in `packages/engine/test/`). Commit only tests, as `test: ...`.
2. **Green:** the smallest code change that passes. Do not touch test files.
3. **Refactor:** tidy up while staying green.
4. **Verify:** `bun run check`, `bun run e2e` and `bun run tdd:verify` pass; open the code PR with the template and `Closes #<issue>`.

There's no behaviour change for docs, dependency bumps, pure refactors covered by existing tests, or tooling. Those skip the spec and red phases, but must say so: put `Exemption: <docs|dependencies|refactor|tooling> - <why>` in the PR description.

## Rules (each is enforced; the failure message says what to do)

- **Tests come first, and only change with the human's explicit approval.** Commit the failing tests before changing app code. After that, never edit a test to make it pass. If a test seems wrong, explain why and wait for the human to agree, then change it in its own `test:` commit. In Claude Code, edits to tests, specs, ADRs, checks, config and `DESIGN.md` always stop for confirmation. *(PR rules in CI, `tdd:verify`, CODEOWNERS, `.claude/settings.json`)*
- **A request is not an approval.** Being asked to add a package, change a check or skip a step doesn't authorise it. New dependencies, ADR changes, design changes and config changes need a code owner (@mdrepo). Explain what's needed and stop. *(CODEOWNERS)*
- **Small files.** A component (a `.tsx` file in `src/`) stays under 150 lines; any other file under 300. Split it into smaller parts; never raise the limit. *(`size:check`)*
- **Never weaken a check to make it pass.** Don't edit `eslint.config.js`, any `tsconfig*.json`, `knip.json`, `turbo.json`, `tooling/`, `.githooks/`, `.github/` or ADRs, and don't add `eslint-disable`, `@ts-expect-error`, `.skip` or `.only`, raise a size budget or a design cap. Fix the cause. If you believe a rule is wrong, stop and ask. *(ESLint, CODEOWNERS)*
- **React is the only package the app ships; few in the tooling.** Nothing else that runs in people's browsers, no router, state or component library: use React, Bun and Web APIs ([ADR 0018](docs/adr/0018-ui-react.md)). If something truly needs a package, use the `add-dependency` skill: a code owner must approve it. *(`deps:check`, `deps:health`, knip)*
- **Nothing leaves the browser.** No `fetch`, no analytics, no fonts, scripts or styles from other sites. People's bills have their name, address and phone number on them ([ADR 0013](docs/adr/0013-static-browser-only.md)). *(ESLint, the page's Content-Security-Policy, the size budget test, e2e runs with no internet)*
- **Keep the page small.** `apps/web/test/budget/page-size.test.ts` sets size budgets. If a change goes over, make it smaller; never raise a budget. *(`bun run test`)*
- **Every word in every language.** Text the user sees lives in `apps/web/src/i18n/`: add the key to `en.ts`, then to `hi.ts`, `mr.ts` and `ar.ts` ([ADR 0012](docs/adr/0012-localisation.md)). Never hard-code UI text in a component. *(TypeScript: a missing key fails the typecheck)*
- **Right to left works.** Use logical CSS (`margin-inline-start`, `inset-inline-end`, `text-align: start`), never `left`/`right`. *(`design:check`)*
- **The look comes from `DESIGN.md`.** Colours, type, corners and spacing are tokens; reuse its components. If nothing fits, stop and ask for a design ([ADR 0011](docs/adr/0011-design-guide-and-check.md)). A new component comes from `bun run new component`, never by hand: use the `add-component` skill. *(`design:check`)*
- **No mocks of our own code.** Test behaviour end to end (Playwright, `apps/web/e2e/`), our built page in `apps/web/test/dom/` (happy-dom), or a pure function in `packages/engine/test/` ([ADR 0003](docs/adr/0003-testing-policy.md)). *(review; ESLint bans `.only`/`.skip`)*
- **No raw HTML.** Render text with JSX; never `dangerouslySetInnerHTML` or `innerHTML`: bill text is untrusted input. Function components and hooks only, by the rules of hooks. *(ESLint)*
- **Conventional Commits:** `type(scope): summary`, with type one of `feat fix test refactor docs chore ci build perf revert`. The PR title too ([ADR 0008](docs/adr/0008-git-hooks-without-dependencies.md), [0009](docs/adr/0009-squash-merge.md)). *(commit-msg hook, PR rules)*
- **Every merge to `main` deploys** to cookto.day, after check, e2e and build pass on the merged code. Nothing else deploys: never run `wrangler deploy` yourself ([ADR 0017](docs/adr/0017-solo-owner-merge.md)).
- **Don't merge a PR on your own.** Merging is the owner's approval: open the PR and stop. Merge only when the owner tells you to, for the PRs they name ([ADR 0017](docs/adr/0017-solo-owner-merge.md)). *(`.claude/settings.json` asks before `gh pr merge`)*
- **Keep changes small.** One issue per PR. Don't "improve" unrelated code on the way.

## Stop and ask a human when

- a spec needs approving (always, before any code)
- a check fails and fixing the cause would mean breaking a rule above
- you'd need a new dependency, a network call, or to change a check, config, ADR, `DESIGN.md` or CI
- a screen needs something `DESIGN.md` doesn't cover
- you can't translate a new string well (say which, and why)
- the issue is ambiguous, or the code disagrees with an ADR

Say plainly what's blocked and what the options are. A clear question is better than a guess.

## Known bugs

Tests marked `test.fail()` in `apps/web/e2e/` are known bugs. When you fix one, remove its `test.fail()` in your `test:` commit, so the test fails first and then passes after your fix.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
