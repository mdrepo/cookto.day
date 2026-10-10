# 0004. Playwright runs locally and in pre-push, offline, not in CI

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

E2E tests are the main behaviour gate ([0003](0003-testing-policy.md)), but running a browser in CI on every push costs CI minutes. And a test that reaches the internet fails when some other site is slow, which teaches people to ignore red tests.

## Decision

- `bun run e2e` runs Playwright (one browser, Chromium, a phone-sized viewport) against the built site, served on localhost by `scripts/serve.ts`, recording video and traces.
- **No internet.** The browser resolves no host except localhost. A slow or missing outside site can't fail a test, and a page that quietly depends on one fails a test instead ([0013](0013-static-browser-only.md)).
- The **pre-push git hook** runs `bun run e2e` for any push that changes the app, its tests or its build.
- CI does **not** run the browser. It does run a cheap check: a PR that changes `src/` outside `src/lib/` must also add or change a file under `e2e/`, or state an exemption from [0002](0002-tdd-workflow.md).
- The PR template asks for the e2e result and, for UI changes, a video.

## Alternatives

- **E2E in CI on every PR:** strongest guarantee, but costs minutes on every push.
- **No e2e at all:** leaves the language switch, right-to-left layout and the whole flow untested.
- **Let tests reach the internet:** flaky, and hides a page that depends on another site.

## Consequences

- Hooks can be skipped with `--no-verify`, and CI cannot confirm e2e was run. **Human review is the backstop.**
- Revisit if skipped e2e runs let regressions through. The first step would be a manually triggered CI job run only on risky PRs.
