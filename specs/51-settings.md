# #51: The language setting goes through the layers, and only data touches storage

- **Issue:** #51
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. The layers ([0022](../docs/adr/0022-app-layers.md)), the store ([0023](../docs/adr/0023-state-and-rerenders.md)) and the data layer ([0024](../docs/adr/0024-data-layer.md)) exist only on paper. The language setting is the smallest real thing that crosses all of them, so it becomes the example every later feature copies. Then storage and network calls can be banned everywhere else.

For households nothing changes: the page looks and behaves as today.

## Design: no flash of English

Today the saved language is read before React's first render, so the page switches in the same frame. IndexedDB can only be read asynchronously, which would show English first. The options:

1. **Small settings in a synchronous key-value store** (the browser's `localStorage`), behind the data layer's adapter. Saved data (pantry, bills, plan) uses IndexedDB, as ADR 0024 says. **Chosen:** no flash, and the stored key stays `cookto.day:language`, so people keep their choice.
2. Everything in IndexedDB, and the page waits for it before drawing: a slower first paint.
3. IndexedDB, plus a `localStorage` copy for the first paint: two places to keep in step.

The browser's storage is handed to `@cookto/data` by one file, `apps/web/src/platform.ts`: "the web app passes the adapter" (ADR 0024). That file is the one place outside `packages/data` allowed to name browser storage.

## Acceptance criteria

Criteria 1–3 are unit tests in `packages/data/test/`, `packages/usecases/test/` and `tooling/test/` (ADR 0003). Criterion 4 is the existing tests, unchanged.

### 1. the settings remember the language

- **Given** a key-value store holding `cookto.day:language` = `mr`
- **When** the settings are created from it, with the app's languages
- **Then** the store's language is `mr`
- **And** with an unknown saved language, or none, or a store that throws (private mode), it's English
- **And** writing a language saves it under `cookto.day:language` and updates the store, even when saving throws

### 2. choosing a language is a use case

- **Given** settings that can be written
- **When** `chooseLanguage` is called with `hi`
- **Then** the settings are written with `hi`
- **And** with a language the app doesn't speak, nothing is written

### 3. only data and the app's platform file touch storage or the network

- **Given** a screen, a hook, a use case or the engine
- **When** it uses `localStorage`, `sessionStorage`, `indexedDB`, `fetch`, `XMLHttpRequest`, `WebSocket` or `navigator.sendBeacon`
- **Then** lint fails, saying only `packages/data` touches storage or the network, and the app hands it the browser's storage in `apps/web/src/platform.ts` (ADR 0024)
- **And** the same code in `packages/data` or `apps/web/src/platform.ts` passes

### 4. the page is the same

- **Given** the existing e2e and DOM tests (language switch, remembered choice, unknown language, right to left, same look)
- **Then** they pass unchanged, on every device

## Words

None.

## Out of scope

- TanStack Query, the IndexedDB adapter and render-count tests: they come with the first feature that reads saved data.
- Syncing settings to the server (ADR 0025).
- **How this lands:** criteria 1–3 are new behaviour, red first. Moving the app onto them changes no behaviour, so that part is a refactor covered by criterion 4; if tdd:verify can't tell the two apart in one PR, the app move is its own PR with a `refactor` exemption.
