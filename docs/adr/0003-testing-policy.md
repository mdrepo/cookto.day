# 0003. Testing policy: e2e for behaviour, DOM tests of our own page, unit tests for pure functions

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

The risk in cookto.day is in what people see and do in their browser: reading a bill, keeping the pantry, ranking dishes, and showing all of it in four languages, one of them right to left. Tests that mock internals break on every refactor and pass while the product is broken, and AI agents produce them readily.

## Decision

Three layers, and nothing in between:

| Layer | Tool | Tests | Rules |
|---|---|---|---|
| **Behaviour** | Playwright against the built static site, served on localhost ([0004](0004-e2e-runs-locally.md)) | What a person does and sees | One test per acceptance criterion, named in the user's words. Selectors live only in `e2e/support/`. This is the behaviour gate. |
| **Our page** | `bun test` with happy-dom, in `test/dom/` | Our own built page running our own bundle: what it shows and stores | See the conditions below. |
| **Pure functions** | `bun test`, in `test/unit/` | Functions in `src/lib/` with no DOM, storage or globals: dates, ranking, parsing bill text | No mocks, no DOM. |

Conditions for the DOM layer:

- Load only our own built HTML and bundle (`scripts/build.ts`). Keep happy-dom's file and network loading disabled (`test/helpers/page.ts`); never load an external page or script. happy-dom has had a sandbox-escape vulnerability that needs an untrusted page; we only ever run our own.
- Never mock or stub our own modules. Storage contents may be set before the page loads.
- happy-dom is pinned to an exact version and listed in `dependency-allowlist.json`.

**If a test needs a mock, it is in the wrong layer.** Either cover the behaviour end to end, or extract a pure function and test that.

Banned: mocking internal modules; HTML or snapshot tests; asserting on implementation details where a user-visible result can be checked; `.skip`, `.only` and `.todo` on the default branch (known bugs use `test.fail()` with a linked issue).

## Alternatives

- **Playwright only:** slow feedback for logic that has many cases (every language, every date edge).
- **jsdom instead of happy-dom:** heavier and slower, for the same layer.
- **Component tests with a UI framework:** there is no UI framework ([0005](0005-supply-chain-policy.md)).

## Consequences

- Tests survive refactors, because they check what the user sees or what a pure function returns.
- E2E tests are slower and need a browser, so they run locally ([0004](0004-e2e-runs-locally.md)).
- Pushes code toward pure functions in `src/lib/`, which is the design we want anyway.
