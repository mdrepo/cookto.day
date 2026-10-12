# 0024. Read and write all data through one data layer that cancels stale work

- **Status:** Proposed
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

[0022](0022-app-layers.md) made `packages/data` the only layer that touches storage, and [0023](0023-state-and-rerenders.md) put the store there. This ADR says how data is read, written, cached and cancelled. Slow work comes from three places: IndexedDB on the phone, a background worker that reads bill PDFs, and later our server (0025, login and sync). The rules must hold for all three, and must not change when sync arrives.

The pains we want gone: a refresh racing an older request and showing old data; two parts of a screen loading the same thing twice; a screen that was left still writing to state; one changed item redrawing a whole list.

## Decision

**Repositories, one per domain:** pantry, dishes, plan, household, settings. Each returns the engine's types ([0022](0022-app-layers.md)), with readers and writers exported apart.

**The phone's copy is what screens show.** Reads come from local storage, always. The network never blocks a screen; sync (0025) updates the local copy in the background, and screens see it like any other change.

**Storage is an adapter.** Repositories save through one small interface (get, put, delete, query by index, one transaction). The web app passes an IndexedDB adapter; tests pass an in-memory one; a React Native app would pass SQLite. Every adapter passes the same contract tests. Our own thin wrapper, no library.

**Records are ready for sync from day one.** Every record has an `id` made on the device (UUID v7), `updatedAt`, a `version` that goes up on each write, and `deletedAt` instead of being removed. Sync then adds to the data, not a migration.

**Screen hooks read data through TanStack Query** (`@tanstack/react-query`, exact version, in the allowlist). Its query functions are repository readers, so it reads the phone's copy like any other source. It gives us, without code of our own:
- **Sharing:** two parts asking for the same key at once make one read.
- **Latest wins:** a refresh cancels the read in flight (`cancelRefetch`). Search keys include the text, so typing moves to a new key.
- **Cancelling:** every query function gets an `AbortSignal` and must pass it on; a read nobody is watching any more is cancelled, and its answer never lands.
- **Unchanged data keeps its identity** (structural sharing, on by default): when 1 of 100 items changes, the other 99 are the same objects and their rows don't redraw ([0023](0023-state-and-rerenders.md), rule 6).
- **Few re-renders:** a component re-renders only for the fields it uses, and `select` narrows a query to one value.

It sits in React's long-cached file ([0018](0018-ui-react.md)), not in our 20 KB, and counts toward the first-visit budget. Its core has no React, so a React Native app uses it too.

**Writes tell queries what changed.** Use cases write through repositories, which announce what changed ("pantry"). One bridge in the app turns that into `invalidateQueries`, so use cases never import React or TanStack. Sync (0025) announces its changes the same way.

**Zustand keeps app-wide settings** ([0023](0023-state-and-rerenders.md)); TanStack Query holds no settings, and Zustand holds no saved data. Each kind of state stays in one home.

**Network calls have a timeout** (15 seconds), set in the network adapter with `AbortSignal.timeout`.

**Errors are values with a kind:** `offline`, `not-found`, `conflict`, `storage-full`, `unknown`. Hooks turn each kind into the kit's error state. Aborts are not errors and are never shown.

**Only `packages/data` touches storage or the network.** Lint bans `indexedDB`, `localStorage`, `sessionStorage`, `fetch`, `XMLHttpRequest`, `WebSocket` and `navigator.sendBeacon` everywhere else. The language setting, in `localStorage` today, moves into the settings repository. `fetch` stays banned until 0025 opens it to `packages/data` only.

**Tested in the user's words:**
- "A refresh cancels the request in flight, and its answer never shows."
- "Two parts asking for the pantry at once make one read."
- "Leaving a screen cancels its work."
- "Changing one item keeps the other 99 as they were."

**Order of PRs:** `packages/data` with the lint bans; TanStack Query and the change bridge; the IndexedDB adapter and its contract tests; the settings repository, with the language moved; then the pantry repository, with the first feature that needs it.

## Alternatives

- **Our own runner** (about 150 lines) for sharing, cancelling and keeping identity: no dependency, but we would maintain and document it, and agents don't know it. TanStack Query does all of it, is tested by many apps, and agents know it well. An earlier draft chose the runner, wrongly counting TanStack Query against our own 20 KB rather than the long-cached file beside React.
- **Dexie for IndexedDB:** pleasant, and its live queries are close to what we want, but it alone would use most of the script budget. A thin wrapper does what we need.
- **`idb`:** tiny, but one maintainer, and the wrapper we need is barely larger.
- **Screens calling storage directly:** the races and double loads above, in every screen.

## Consequences

- A screen never waits on the network, and works the same offline.
- Races, double loads and stale answers are handled once, by a library built for them, not in each screen.
- We own only the IndexedDB wrapper and the change bridge. TanStack Query is one more dependency to keep healthy, pinned and reviewed on each upgrade.
- If TanStack Query's size grows past the first-visit budget, revisit.
- Every adapter must pass the contract tests, which is what makes a React Native app possible.
