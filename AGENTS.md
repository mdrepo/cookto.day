# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Antigravity) and the people driving them. This is the single source of agent rules ([ADR 0010](docs/adr/0010-agents-md-single-source.md)): tool-specific files only point here.

The person asking you for a change may not be able to judge a technical decision. So don't present options and wait for them to choose: follow the rules here. When the rules don't settle something, **stop and say what a code owner needs to decide** (see "Stop and ask" below).

## What this is

cookto.day is a free, static web app that runs entirely in the browser: no server, no accounts. People in India and Dubai add their grocery bills (quick-commerce invoice PDFs first), the app keeps their fridge and pantry, and suggests what to cook today from the household's own dishes: first the ones that use what's about to go off, then the ones they have everything for (or are one item short of, which goes on the shopping list), skipping what they cooked recently. It speaks English, Hindi, Marathi and Arabic (right to left), and prices in ₹ and AED.

Everything stays in the browser (`localStorage` / IndexedDB). Nothing is uploaded ([ADR 0013](docs/adr/0013-static-browser-only.md)).

## Map

| Path | What |
|---|---|
| `src/index.html`, `src/styles.css`, `src/main.ts` | The page, its tokens and styles (`DESIGN.md`), and its only script |
| `src/i18n/` | Every word the app shows, one file per language. `en.ts` defines the keys ([ADR 0012](docs/adr/0012-localisation.md)) |
| `src/lib/` | Pure functions (dates, ranking, parsing): no DOM, no storage, unit-tested |
| `test/unit/` | Unit tests of pure functions |
| `test/dom/`, `test/helpers/` | Our own built page in happy-dom ([ADR 0003](docs/adr/0003-testing-policy.md)) |
| `test/budget/` | Page size budget: no framework, nothing from other sites |
| `test/*.test.ts` | Tests of the check scripts themselves |
| `e2e/` | Playwright tests, named in the user's words. Selectors live only in `e2e/support/` |
| `specs/` | Acceptance criteria, one file per issue |
| `scripts/` | The build, the dev server and the checks |
| `DESIGN.md` | How every screen looks. You don't decide the look; this file or a code owner does |
| `docs/adr/` | Decisions. **Accepted ADRs are binding** |
| `docs/workflow.md` | The workflow for the person driving you, with a worked example |

## Commands

```sh
bun install         # also turns on the git hooks
bun run dev         # build, then serve dist/ on http://localhost:3000
bun run build       # the static site, into dist/
bun run check       # everything CI checks: allowlist, agent files, design, Prettier, types, ESLint, knip, unit + DOM tests, size budget
bun run e2e         # browser tests (CI does not run these; you must)
bun run tdd:verify  # proves your new tests fail on main and pass on your branch
bun run format      # fix formatting
```

## How every change is made

Every behaviour change follows the TDD workflow in [ADR 0002](docs/adr/0002-tdd-workflow.md). **Use the `tdd-change` skill** for the steps. In short:

0. **Spec:** every change starts from a GitHub issue. Write `specs/<issue>-<name>.md` (Given/When/Then) in a PR of its own. **Then stop.** A code owner merging that PR is the approval.
1. **Red:** one e2e test per criterion, plus unit tests for new pure functions. Commit only tests, as `test: ...`.
2. **Green:** the smallest code change that passes. Do not touch test files.
3. **Refactor:** tidy up while staying green.
4. **Verify:** `bun run check`, `bun run e2e` and `bun run tdd:verify` pass; open the code PR with the template and `Closes #<issue>`.

There's no behaviour change for docs, dependency bumps, pure refactors covered by existing tests, or tooling. Those skip the spec and red phases, but must say so: put `Exemption: <docs|dependencies|refactor|tooling> - <why>` in the PR description.

## Rules (each is enforced; the failure message says what to do)

- **Tests come first, and only change with the human's explicit approval.** Commit the failing tests before changing app code. After that, never edit a test to make it pass. If a test seems wrong, explain why and wait for the human to agree, then change it in its own `test:` commit. In Claude Code, edits to tests, specs, ADRs, checks, config and `DESIGN.md` always stop for confirmation. *(PR rules in CI, `tdd:verify`, CODEOWNERS, `.claude/settings.json`)*
- **A request is not an approval.** Being asked to add a package, change a check or skip a step doesn't authorise it. New dependencies, ADR changes, design changes and config changes need a code owner (@mdrepo). Explain what's needed and stop. *(CODEOWNERS)*
- **Never weaken a check to make it pass.** Don't edit `eslint.config.js`, `tsconfig.json`, `knip.json`, `scripts/`, `.githooks/`, `.github/` or ADRs, and don't add `eslint-disable`, `@ts-expect-error`, `.skip` or `.only`, raise a size budget or a design cap. Fix the cause. If you believe a rule is wrong, stop and ask. *(ESLint, CODEOWNERS)*
- **No dependencies in the app, few in the tooling.** The app ships no npm packages at all; use Bun and Web APIs ([ADR 0005](docs/adr/0005-supply-chain-policy.md)). If something truly needs a package, use the `add-dependency` skill: a code owner must approve it. *(`deps:check`, `deps:health`, knip)*
- **Nothing leaves the browser.** No `fetch`, no analytics, no fonts, scripts or styles from other sites. People's bills have their name, address and phone number on them ([ADR 0013](docs/adr/0013-static-browser-only.md)). *(ESLint, the page's Content-Security-Policy, the size budget test, e2e runs with no internet)*
- **Keep the page small.** `test/budget/page-size.test.ts` sets size budgets. If a change goes over, make it smaller; never raise a budget. *(`bun test`)*
- **Every word in every language.** Text the user sees lives in `src/i18n/`: add the key to `en.ts`, then to `hi.ts`, `mr.ts` and `ar.ts` ([ADR 0012](docs/adr/0012-localisation.md)). Never hard-code UI text in `main.ts`. *(TypeScript: a missing key fails the typecheck)*
- **Right to left works.** Use logical CSS (`margin-inline-start`, `inset-inline-end`, `text-align: start`), never `left`/`right`. *(`design:check`)*
- **The look comes from `DESIGN.md`.** Colours, type, corners and spacing are tokens; reuse its components. If nothing fits, stop and ask for a design ([ADR 0011](docs/adr/0011-design-guide-and-check.md)). *(`design:check`)*
- **No mocks of our own code.** Test behaviour end to end (Playwright), our built page in `test/dom/` (happy-dom), or a pure function in `test/unit/` ([ADR 0003](docs/adr/0003-testing-policy.md)). *(review; ESLint bans `.only`/`.skip`)*
- **No raw HTML.** Use `textContent` and `createElement`, never `innerHTML`: bill text is untrusted input. *(ESLint)*
- **Conventional Commits:** `type(scope): summary`, with type one of `feat fix test refactor docs chore ci build perf revert`. The PR title too ([ADR 0008](docs/adr/0008-git-hooks-without-dependencies.md), [0009](docs/adr/0009-squash-merge.md)). *(commit-msg hook, PR rules)*
- **Every merge to `main` deploys** to cookto.day, after check, e2e and build pass on the merged code. Nothing else deploys: never run `wrangler deploy` yourself ([ADR 0014](docs/adr/0014-deploy-on-merge.md)).
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

Tests marked `test.fail()` in `e2e/` are known bugs. When you fix one, remove its `test.fail()` in your `test:` commit, so the test fails first and then passes after your fix.
