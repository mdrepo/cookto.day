# 0024. Read and write all data through one data layer that cancels stale work

- **Status:** Proposed
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

[0022](0022-app-layers.md) made `packages/data` the only layer that touches storage, and [0023](0023-state-and-rerenders.md) put the store there. This ADR says how data is read, written, cached and cancelled. Slow work comes from three places: IndexedDB on the phone, a background worker that reads bill PDFs, and later our server (0025 (next), login and sync). The rules must hold for all three, and must not change when sync arrives.

The pains we want gone: a refresh racing an older request and showing old data; two parts of a screen loading the same thing twice; a screen that was left still writing to state; one changed item redrawing a whole list.

## Decision

**Repositories, one per domain:** pantry, dishes, plan, household, settings. Each returns the engine's types ([0022](0022-app-layers.md)), with readers and writers exported apart.

**The phone's copy is what screens show.** Reads come from local storage, always. The network never blocks a screen; sync (0025 (next)) updates the local copy in the background, and screens see it like any other change.

**Storage is an adapter.** Repositories save through one small interface (get, put, delete, query by index, one transaction). The web app passes an IndexedDB adapter; tests pass an in-memory one; a React Native app would pass SQLite. Every adapter passes the same contract tests. Our own thin wrapper, no library.

**Records are ready for sync from day one.** Every record has an `id` made on the device (UUID v7), `updatedAt`, a `version` that goes up on each write, and `deletedAt` instead of being removed. Sync then adds to the data, not a migration.

**All slow work goes through one runner,** `run(key, work, policy)`:
- **Everything can be cancelled.** `work` gets an `AbortSignal` and must pass it on.
- **`share` (the default):** a second call with the same key, while the first is running, joins it. Two parts asking at once make one request.
- **`latest`:** a new call aborts the one in flight. For refresh and search-as-you-type.
- **Work belongs to an owner.** A screen hook's work is cancelled when its component goes away.
- **Cancelled work never lands.** The runner checks the signal before any result reaches the store.
- **Network work has a timeout** (15 seconds); local work doesn't.

**Unchanged data keeps its identity.** When a query runs again, a record with the same `id` and `version` is the previous object, and a list with no changes is the previous list. One changed item in 100 redraws one row ([0023](0023-state-and-rerenders.md), rule 6).

**Writes tell the cache what changed.** A write to the pantry marks the pantry's queries stale; they run again and keep what didn't change.

**Errors are values with a kind:** `offline`, `not-found`, `conflict`, `storage-full`, `unknown`. Hooks turn each kind into the kit's error state. Aborts are not errors and are never shown.

**Only `packages/data` touches storage or the network.** Lint bans `indexedDB`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket` and `navigator.sendBeacon` everywhere else. The language setting, in `localStorage` today, moves into the settings repository. `fetch` stays banned until 0025 (next) opens it to `packages/data` only.

**Tested in the user's words:**
- "A refresh cancels the request in flight, and its answer never shows."
- "Two parts asking for the pantry at once make one read."
- "Leaving a screen cancels its work."
- "Changing one item keeps the other 99 as they were."

**Order of PRs:** `packages/data` with the lint bans; the runner; the IndexedDB adapter and its contract tests; the settings repository, with the language moved; then the pantry repository, with the first feature that needs it.

## Alternatives

- **TanStack Query:** does sharing, cancelling and caching, and agents know it. But it is a second cache beside our local data and the store, built for server data first, and about 13 KB gzipped against a 20 KB budget for all our scripts ([0018](0018-ui-react.md)). Our runner is about 150 lines with the rules above.
- **Dexie for IndexedDB:** pleasant, and its live queries are close to what we want, but it alone would use most of the script budget. A thin wrapper does what we need.
- **`idb`:** tiny, but one maintainer, and the wrapper we need is barely larger.
- **Screens calling storage directly:** the races and double loads above, in every screen.

## Consequences

- A screen never waits on the network, and works the same offline.
- Races, double loads and stale writes are handled once, in tested code, not in each screen.
- We own about 300 lines (runner, wrapper, sharing). If they grow past that, revisit TanStack Query or Dexie.
- Every adapter must pass the contract tests, which is what makes a React Native app possible.
