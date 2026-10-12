# #45: Each layer can import only what it's allowed to, and lint says where code belongs

- **Issue:** #45
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. [ADR 0022](../docs/adr/0022-app-layers.md) splits the app into screens, screen hooks, use cases, the engine and data. A rule people must remember gets broken by the first agent in a hurry; a lint error that says where the code belongs doesn't. The packages for use cases and data must exist, empty, so the first feature starts inside the layers.

## Acceptance criteria

This is tooling, not a screen, so each criterion becomes one test in `tooling/test/`: it lints a few lines of code as if they sat in a given file, and checks the error (ADR 0002, 0003).

### 1. a screen can't reach data or use cases

- **Given** a screen, `apps/web/src/features/pantry/PantryScreen.tsx`
- **When** it imports from `@cookto/data`, `@cookto/usecases`, `zustand` or `@tanstack/react-query`
- **Then** lint fails, saying a screen draws what its hook gives it, and to read or act in a `use*.ts` hook beside it (ADR 0022)
- **And** importing `@cookto/ui` or its own hook passes

### 2. only use cases write data

- **Given** any file outside `packages/usecases`, such as a screen hook
- **When** it imports `@cookto/data/write`
- **Then** lint fails, saying writes go through a use case (ADR 0022)
- **And** a screen hook importing `@cookto/data/read` or `@cookto/usecases` passes
- **And** a file in `packages/usecases` importing `@cookto/data/write` passes

### 3. use cases, data and the engine have no React

- **Given** a file in `packages/usecases`, `packages/data` or `packages/engine`
- **When** it imports `react`, `react-dom`, `@tanstack/react-query`, `zustand` (the React part) or `@cookto/ui`
- **Then** lint fails, saying this layer runs without React, so it can be tested without a browser and reused by another app (ADR 0022)
- **And** `packages/data` importing `zustand/vanilla` passes

### 4. each package imports only the layers below it

- **Given** the engine, data and use cases
- **When** the engine imports any other `@cookto/` package, or data imports anything of ours but the engine, or use cases import an app
- **Then** lint fails, naming what that layer may import (ADR 0022)

### 5. features don't reach into each other

- **Given** a file in `apps/web/src/features/pantry/`
- **When** it imports from `../plan/`
- **Then** lint fails, saying what two features share moves down a layer: to a use case, the engine, data or the kit (ADR 0022)
- **And** importing from its own feature, or `../../i18n`, passes

### 6. the new packages exist

- **Given** the repo
- **Then** `@cookto/usecases` and `@cookto/data` (with `@cookto/data/read` and `@cookto/data/write`) are workspaces that typecheck and lint, with nothing in them yet, and no access to the browser's own types (no `window`, no `document`)

## Words

None for the app. Lint messages are for whoever builds cookto.day, in English, and each names ADR 0022.

## Out of scope

- **Banning storage and network calls outside `packages/data`** (ADR 0024). The language setting still uses `localStorage` in the app, so the ban comes with the settings repository, which moves it.
- Where the IndexedDB adapter lives: it needs the browser's types, which these packages don't have. Its own PR decides.
- `bun run new screen`, Zustand, TanStack Query and React Compiler: their own PRs.
- Moving the AGENTS.md lines and the generators to the new layers: each with the PR that makes them true.
