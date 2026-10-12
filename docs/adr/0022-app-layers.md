# 0022. Split the app into screens, screen hooks, use cases and data, with imports checked

- **Status:** Accepted
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

The design kit ([0019](0019-design-system.md)) says how screens look. Nothing yet says where their logic and data go. Real features come next: onboarding, bills, the pantry, the week plan, and later login so the schedule opens on another phone. Without a rule, agents put a little of everything in each component: storage calls, rules, state. Then every change touches every layer, tests need a browser, and one changing value re-renders whole screens.

The usual answer is a layered pattern: UI, view model, use case, repository. Done in full, it brings a class per use case, a mapper between every layer, and files that only pass calls along. We want the separation without the ceremony, and a check that holds it.

## Decision

**Five layers.** Each may import only the layers below it.

| Layer | Where | What it does | May import |
|---|---|---|---|
| Screen | `apps/web/src/features/<feature>/*.tsx` | Draws what its hook gives it, and calls its actions. No logic, no data access | `@cookto/ui`, its own feature's hooks, `i18n` |
| Screen hook | `apps/web/src/features/<feature>/use*.ts` | The view model. Picks state for its component and offers actions | Use cases, data readers, the store |
| Use cases | `packages/usecases` (new), one file per domain | The app's steps: check the input, write, queue what follows. Plain functions, shared by every screen and every app | `@cookto/engine`, data writers' types, other use cases |
| Engine | `packages/engine` | Domain models and rules. Pure TypeScript | Nothing else of ours |
| Data | `packages/data` (new) | Repositories: how data is fetched, cached, cancelled and later synced. Where it's stored is an adapter the app passes in | `@cookto/engine` only |

- **A screen hook is the view model.** It's a hook, not a class: React already gives it a lifecycle. Any component that needs data gets its own small hook; a list row can have `usePantryRow(id)` and read just its item.
- **Use cases are plain functions,** with what they need passed in: `addItem({ pantry }, input)`. Tests pass fakes, so they run fast with no browser and no database. No classes, no `execute()`.
- **Reads may skip the use case.** A hook may read a repository directly. **Writes always go through a use case,** because writes carry the rules. `packages/data` exports readers and writers separately (`@cookto/data/read`, `@cookto/data/write`); only `packages/usecases` may import writers.
- **One model.** The engine's types are used in every layer. Data maps only at its edges (the database's shape, later the server's). No mapper between hook and screen.
- **No React or browser below the hook.** Use cases, the engine and data never import React or the DOM, so they can be tested without a browser, and a second app (a React Native one, say) reuses all three.
- **Storage is an adapter.** `packages/data` saves through a small storage interface. The web app passes one built on IndexedDB; another app passes its own (SQLite on a phone). Repositories, caching and sync are written once.
- **Use cases are grouped by domain, not by screen:** `pantry.ts`, `plan.ts`, `bills.ts`. Any screen hook may call any use case, and a use case may call another (`addBill` uses `addItem`). A rule lives once, however many screens need it.
- **Features don't reach into each other.** A feature folder holds screens and their hooks only. It imports another feature's code only through use cases, the engine, data or the kit. What two features share moves down a layer.
- **Screens by feature, logic by domain.** A feature's screens and hooks change together, so they sit together in the app. Use cases outlive any one screen or app, so they sit in their own package.

**Checked by lint,** with ESLint's own `no-restricted-imports` per file pattern, so no plugin. Each rule's message names this ADR and says where the code belongs instead.

**Started by the generator.** `bun run new screen <name>` (named in [0019](0019-design-system.md)) writes the feature folder: the screen, its hook, and a red test for each. Use cases are added to their domain's file, with their tests.

**One kind of test per layer**, within [0003](0003-testing-policy.md):

| Layer | Test |
|---|---|
| Engine | Unit tests |
| Use cases | Unit tests with fake repositories |
| Screen hooks | DOM tests, including what re-renders (the state ADR says how) |
| Screens | e2e, as today |

**Worked example: login.** Login arrives with its own ADR. It must re-render almost nothing:
- **The token lives in `packages/data`, outside React.** Data adds it to each request. A token refresh re-renders no component.
- **Only parts that show auth read it,** through their own hooks: the sync badge, the account row in Settings. Signing in re-renders those.
- **Screens don't wait on login.** Their data is already on the phone; signing in starts sync, and only changed items redraw.
- **Signing out is the one full reset,** because whose data is shown changes.

**Order of PRs:**
1. This ADR.
2. The state ADR: the store, re-render rules and how they're tested.
3. The data ADR: repositories, cancelling stale work, sync and login. It supersedes [0013](0013-static-browser-only.md).
4. The lint rules, `packages/usecases` and `packages/data`, then `new screen`, each with its issue, spec and tests.
5. Onboarding, the first feature built this way.

## Alternatives

- **Full Clean Architecture:** a class per use case, a mapper per layer boundary, interfaces for everything. Many files that only pass calls along, which agents copy without thinking. We keep the boundaries and drop the ceremony.
- **Folders by layer for everything** (`components/`, `hooks/`, `usecases/`): one screen's change spreads over many folders. We split by layer only where sharing needs it: use cases.
- **Use cases inside each feature folder:** a use case two features need, like marking an item used from the pantry and from the week plan, has no proper home and gets copied.
- **Use cases inside `apps/web`:** fine for one app, but a React Native app would have to copy them or move them later, across every import.
- **Logic in components:** quickest to write, but needs a browser to test, and mixes state into drawing, which costs re-renders.
- **`eslint-plugin-boundaries`** for the import rules: a dependency for what `no-restricted-imports` already does here.
- **Every read through a use case:** symmetrical, but most would be one line passing a call along.

## Consequences

- An agent adding a feature runs `new screen` and fills in layers whose imports are already checked.
- Rules live in the engine and use cases, so most tests are fast unit tests.
- More files per feature than a single component, written by the generator.
- Revisit if most use cases stay one-line writes (merge them into data), or if the lint rules need many exceptions.
