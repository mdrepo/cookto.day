# 0022. Split each feature into screen, screen hook, use cases and data, with imports checked

- **Status:** Proposed
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
| Use cases | `apps/web/src/features/<feature>/usecases.ts` | The app's steps: check the input, write, queue what follows. Plain functions | `@cookto/engine`, data writers' types |
| Engine | `packages/engine` | Domain models and rules. Pure TypeScript | Nothing else of ours |
| Data | `packages/data` (new) | Repositories: where data lives and how it's fetched, cached, cancelled and later synced | `@cookto/engine` only |

- **A screen hook is the view model.** It's a hook, not a class: React already gives it a lifecycle. Any component that needs data gets its own small hook; a list row can have `usePantryRow(id)` and read just its item.
- **Use cases are plain functions,** with what they need passed in: `addItem({ pantry }, input)`. Tests pass fakes, so they run fast with no browser and no database. No classes, no `execute()`.
- **Reads may skip the use case.** A hook may read a repository directly. **Writes always go through a use case,** because writes carry the rules. `packages/data` exports readers and writers separately (`@cookto/data/read`, `@cookto/data/write`); only `usecases.ts` files may import writers.
- **One model.** The engine's types are used in every layer. Data maps only at its edges (the database's shape, later the server's). No mapper between hook and screen.
- **No React below the hook.** Use cases, the engine and data never import React, so they can be tested and reused without it.
- **Features don't reach into each other.** A feature imports another feature's code only through the engine, data or the kit. What two features share moves down a layer.
- **Folders by feature, not by layer.** Things that change together sit together.

**Checked by lint,** with ESLint's own `no-restricted-imports` per file pattern, so no plugin. Each rule's message names this ADR and says where the code belongs instead.

**Started by the generator.** `bun run new screen <name>` (named in [0019](0019-design-system.md)) writes the feature folder: the screen, its hook, `usecases.ts`, and a red test for each.

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
4. The lint rules and `packages/data`, then `new screen`, each with its issue, spec and tests.
5. Onboarding, the first feature built this way.

## Alternatives

- **Full Clean Architecture:** a class per use case, a mapper per layer boundary, interfaces for everything. Many files that only pass calls along, which agents copy without thinking. We keep the boundaries and drop the ceremony.
- **Folders by layer** (`components/`, `hooks/`, `usecases/`): one feature's change spreads over five folders.
- **Logic in components:** quickest to write, but needs a browser to test, and mixes state into drawing, which costs re-renders.
- **`eslint-plugin-boundaries`** for the import rules: a dependency for what `no-restricted-imports` already does here.
- **Every read through a use case:** symmetrical, but most would be one line passing a call along.

## Consequences

- An agent adding a feature runs `new screen` and fills in layers whose imports are already checked.
- Rules live in the engine and use cases, so most tests are fast unit tests.
- More files per feature than a single component, written by the generator.
- Revisit if most use cases stay one-line writes (merge them into data), or if the lint rules need many exceptions.
