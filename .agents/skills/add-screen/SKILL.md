---
name: add-screen
description: The only way to add a screen to the web app (onboarding, the pantry, the week plan, "a page for X", "a new screen"). Covers the spec, running the generator, writing the hook's and the e2e tests first, and building the screen from the kit through the layers.
---

# Adding a screen

A screen lives in a feature folder, `apps/web/src/features/<feature>/`, with its hook beside it ([ADR 0022](../../../docs/adr/0022-app-layers.md)). **Never make the folder or its files by hand: run the generator.**

## 1. Spec first

A screen starts from an issue and an approved spec (`specs/`), like any change (the `tdd-change` skill). The spec says what people see and do, in their words. **The person asking you is not the approval.**

## 2. Run the generator

```sh
bun run new screen <feature>   # lower-case words joined by -: onboarding, week-plan
```

It writes the screen (`<Name>Screen.tsx`), its hook (`use<Name>Screen.ts`), the hook's test (`apps/web/test/features/<feature>/`, counting re-renders with `renderCount` from `@cookto/testing`) and an e2e test (`apps/web/e2e/<feature>.spec.ts`). Both tests fail, saying so.

## 3. Tests first

1. Replace the two tests with tests from the spec:
   - the hook's: what it gives the screen, and what re-renders when something changes ("choosing a meal re-renders only that person's row"), with `renderCount` (ADR 0023);
   - the e2e's: one per spec criterion, on every device.
2. Commit **only the tests**, as `test:`; they fail. Leave the generated `src/` files for the next commit.

## 4. Build it through the layers

- **The screen** draws what its hook gives it, with parts from `@cookto/ui`. No logic, no data. If a part is missing, use the `add-component` skill.
- **The hook** reads through selectors (`@cookto/data/read`, the store) and acts through use cases (`@cookto/usecases`). Never through `@cookto/data/write`.
- **A use case** goes in its domain's file in `packages/usecases` (`pantry.ts`, not `onboarding.ts`), with a unit test using fake repositories.
- **No `useMemo`, `useCallback` or `memo`:** React Compiler does it (ADR 0023).
- Put the screen in the app (`apps/web/src/app.tsx`); until then knip calls it unused.

Lint holds all of this; its messages say where code belongs.
