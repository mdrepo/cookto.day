# #61: Saving data: sync-ready records, a record store, and the household repository

- **Issue:** #61
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are the household, and whoever builds cookto.day. Onboarding saves who eats and which meals ([ADR 0026](../docs/adr/0026-meals-belong-to-people.md)), and nothing can save yet. [ADR 0024](../docs/adr/0024-data-layer.md) says how: repositories save through a small storage interface, every storage passes the same contract, and records are ready for sync from day one, so login and sync later add to the data instead of migrating it.

## Acceptance criteria

Criteria 1–3 and 5 are unit tests, in `packages/data/test/`, `packages/testing/` and `tooling/test/`. Criterion 4 runs in real browsers with Playwright, in `packages/data-web/e2e/` (ADR 0002, 0003, 0021).

### 1. records are ready for sync

- **Given** records made on the phone
- **Then** each has an id that's a UUID v7: unique, and in the order they were made
- **And** each write adds 1 to the record's `version` and sets `updatedAt`
- **And** deleting a record sets `deletedAt` and keeps it, so another phone can learn it's gone

### 2. a record store keeps what's put in it

- **Given** a record store (in memory, for now)
- **When** records are put in a collection
- **Then** each can be read back by its id, and the collection lists them all
- **And** reading an id that isn't there gives nothing, not an error
- **And** putting several records at once saves all of them or none
- **And** a read that's cancelled stops with an abort, and never returns (ADR 0024)

These checks are one contract, in `@cookto/testing`, that every record store must pass.

### 3. the household remembers its people

- **Given** a household repository on a record store
- **When** someone adds an adult, then a child
- **Then** the household lists both, in the order added, each with their default meals (ADR 0026)
- **And** changing a person's meals saves them, with the person's `version` up by 1
- **And** removing a person leaves them out of the list, but keeps their record, marked deleted
- **And** a stored person the engine finds wrong (`memberProblems`) is left out of the list, instead of breaking it
- **And** each change announces that the household changed, so whatever shows it can read it again (ADR 0024)

### 4. the browser keeps it, on every device

- **Given** the IndexedDB record store, in Chrome on an Android phone, Safari on an iPhone, and desktop Chrome
- **Then** it passes the same contract as criterion 2
- **And** what it saved is still there after the page reloads

### 5. only data touches storage

- **Given** the new `packages/data-web`, which holds the browser's storage (IndexedDB, and the `localStorage` key-value store, moved from `apps/web/src/platform.ts`)
- **Then** lint lets it touch storage, as it does `packages/data` (ADR 0024)

## Words

None.

## Out of scope

- TanStack Query, and hooks that read the household: step 2c, with onboarding.
- Sync and login (ADR 0025).
- Indexes and queries beyond "by id" and "all": added when a feature needs them.

## How it lands: two PRs

1. **Records, the record store and the household** (criteria 1–3): the interface, an in-memory store, the contract in `@cookto/testing`, and the household repository. Red first.
2. **The browser's storage** (criteria 4–5): `@cookto/data-web` with the IndexedDB store, run against the contract in all three browsers, and the `localStorage` store moved there. Red first.
