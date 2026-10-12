# 0013. Static and browser-only: no server, data stays on the device

- **Status:** Superseded by 0025
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Grocery bills carry names, addresses, phone numbers and what a household eats. People should be able to use cookto.day without trusting us with any of that. A free app also shouldn't need a server to keep running. And people use it on a phone, often on mobile data.

## Decision

- **Static site.** `bun run build` (`scripts/build.ts`, using `Bun.build`) turns `src/*.html` and what they link into `dist/`. There is no server code; any static host can serve `dist/`.
- **Data stays in the browser,** in `localStorage` (small settings) and IndexedDB (bills, pantry, dishes). No accounts, no analytics, no uploads.
- **No network.** The page's Content-Security-Policy allows only its own files and blocks every connection (`connect-src 'none'`). ESLint bans `fetch` and `XMLHttpRequest` in `src/`. E2E tests run with no internet ([0004](0004-e2e-runs-locally.md)). Sending anything anywhere needs a new ADR.
- **Nothing from other sites:** no CDNs, web fonts or third-party scripts. Everything ships with the app.
- **Small.** `test/budget/page-size.test.ts` (part of `bun run check`) builds the site and fails when a page with its stylesheets or the site's scripts go over their gzipped budgets, or when a page loads anything from another site. Budgets are raised only by a code owner.
- **Export and import** of the household's data, as a file, will be the backup, since there is no server copy.

## Alternatives

- **A backend with accounts:** sync across devices, but we'd hold people's bills, and the app would cost money to run.
- **A UI framework or SPA toolkit:** more code to ship than the app needs ([0005](0005-supply-chain-policy.md)).
- **Server-side bill parsing:** easier PDFs, but the bills leave the device.

## Consequences

- Clearing browser data loses the pantry unless it was exported. The app must say so plainly.
- No sync between phones in a household, until an ADR decides otherwise.
- Hard work moves to the browser: parsing invoice PDFs locally is the biggest open question.
