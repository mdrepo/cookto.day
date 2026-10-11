# 0021. Test on an Android phone, an iPhone and a desktop, offline in every browser

- **Status:** Accepted
- **Date:** 2026-10-12
- **Deciders:** Mayur
- **Supersedes:** [0004](0004-e2e-runs-locally.md)

## Context

[0004](0004-e2e-runs-locally.md) runs every e2e test in one browser, Chromium, at one phone size. Many people in Dubai and India use iPhones, and every iPhone browser is Safari's engine, WebKit, which draws some things its own way. The first run of our tests in WebKit found one at once: the language list was 23px tall on an iPhone, not 44px, because Safari draws its own select box. Since #33 the tests also run on a desktop. 0004's way of keeping tests offline is a Chromium flag, which WebKit doesn't have.

## Decision

- `bun run e2e` runs every test in three Playwright projects: **an Android phone** (Chromium, Pixel 7), **an iPhone** (WebKit, iPhone 15) and **a desktop** (Chromium, 1280px). A test that fails in any of them fails.
- **No internet, in every browser.** Every request but localhost goes through a proxy that isn't there (`127.0.0.1:9`), so it fails. A slow or missing outside site can't fail a test, and a page that quietly depends on one fails a test instead ([0013](0013-static-browser-only.md)).
- Everything else in 0004 stands: tests run against the built site on localhost, with video and traces; the pre-push hook runs them; CI checks a UI change touches an `e2e/` folder; the deploy runs them on the merged code before anything goes live ([0017](0017-solo-owner-merge.md)). The deploy installs Chromium and WebKit.

## Alternatives

- **Chromium only, as before:** misses Safari's differences, as the select showed.
- **Firefox too:** few of our people use it on phones; add it if they do.
- **Real devices or a device cloud:** truer, but costs money, needs an account and a network, and can't run offline in the pre-push hook.

## Consequences

- The e2e run takes about three times as long as with one browser, still seconds.
- Each developer installs WebKit once (`bunx playwright install webkit`); the pre-push hook says so if it's missing.
- Playwright's WebKit is close to Safari, not the same. Revisit with a device cloud if real iPhones show bugs the tests don't.
