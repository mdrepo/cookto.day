# 0018. Build the UI with React, cache it for good, and budget our own code

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** Mayur
- **Supersedes:** [0005](0005-supply-chain-policy.md)

## Context

The next screens are interactive: onboarding with typed answers, swipe cards for the fridge, a week you rearrange, sheets. A spike (branch `spike/ui-layer`, never merged) built onboarding step 1 twice with the same e2e tests. Plain functions need two code paths per component, one to build and one to update, and the e2e tests caught a naive version losing the cursor on the first keystroke. A component library removes that class of bug. React is the one contributors and agents know best, and the one its libraries are written for; the owner chose it over Preact (the same API, about 5 KB) knowing it costs about 55 KB gzipped.

That is fine on mobile data in India, Dubai, Japan or Singapore, once. It shouldn't be paid again on every visit, or every deploy.

[0005](0005-supply-chain-policy.md) said no runtime dependencies, because code that ships runs next to people's bills. That reason still holds for every package except the ones this ADR names.

## Decision

- **React and React DOM are the only runtime dependencies** (with `scheduler`, which React DOM requires). Any other package that ships to users (a router, state, CSS-in-JS, a component kit, a date library) needs its own ADR. Build and test tools stay dev dependencies and go through the allowlist ([0006](0006-dependency-health-check.md)).
- **React gets its own file,** named by its content hash (`react-<hash>.js`). It changes only when React's version changes.
- **Hashed files are cached for a year,** `Cache-Control: public, max-age=31536000, immutable`, set in `dist/_headers`. Pages are revalidated every time, so a deploy shows at once.
- **A service worker keeps the app on the phone,** so a repeat visit opens with no network. It updates in the background and swaps in on the next launch. The page's CSP allows only our own worker.
- **The budget splits in two** (`test/budget/`): **our own JavaScript stays at 20 KB** gzipped, and **a first visit, everything included, stays at 100 KB**. A test fails if React ends up in our files, or ours in React's, because then the cache quietly stops working.
- **React rules, enforced by lint:** no `dangerouslySetInnerHTML` (bill text is untrusted, as `innerHTML` was), the hooks rules, no class components.
- Everything else in [0005](0005-supply-chain-policy.md) stands, unchanged: exact versions and `exact = true`; a committed lockfile and `--frozen-lockfile`; no install scripts (`trustedDependencies` empty); the 7-day minimum release age; `bun audit` failing on high and critical; gitleaks in pre-commit and CI; Actions pinned by SHA with minimum permissions and no kept credentials; CODEOWNERS on `package.json`, `bun.lock`, `bunfig.toml` and `.github/`.

## Alternatives

- **Preact,** directly or as React through `preact/compat`: the same code at a tenth of the size. Rejected by the owner: React is what people know and what its ecosystem targets, and the size is paid once.
- **Plain functions:** the smallest; every component written twice, and the bugs the spike found are easy to make.
- **Next.js:** ships React plus its own runtime, and expects a server. We serve static files ([0013](0013-static-browser-only.md)).
- **React from a CDN:** shared caching across sites no longer exists in browsers, and it breaks "nothing from another site".

## Consequences

- One way to write every screen, the way most of the web does.
- The first visit downloads about 55 KB more than it would without React. A repeat visit downloads nothing; a deploy downloads only our changed files.
- A cheap phone still runs React's code on each launch. e2e checks time-to-first-screen so we notice if it grows.
- A React upgrade is one long-cached file invalidated, on purpose, through the normal dependency PR.

## Implementation notes (2026-10-11)

- React's file is `chunk-<hash>.js`, not `react-<hash>.js`: Bun names every shared chunk `chunk`. The budget test finds it by content and checks it holds no code of ours, and its name stays the same when only our code changes.
- `_headers` lists each hashed file by name, so the year-long cache can't catch a page or a future service worker.
- The page's no-script copy is the app itself: the build renders `App` in English into `<div id="app">`, so it can't drift from the React code.
- The DOM tests build without the split, so the page's script still runs as one inline file in happy-dom.
- `eslint-plugin-react-hooks` is 5.2.0: the same rules as 7.x without Babel and its 40-odd packages.
- Not yet: the service worker (offline repeat visits) and the time-to-first-screen check. Working offline is new behaviour, so it comes as its own issue, spec and tests.
