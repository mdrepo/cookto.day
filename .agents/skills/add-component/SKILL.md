---
name: add-component
description: The only way to add a part to the design system in packages/ui (a button, a card, a chip, a sheet, a list row, "make a component for X", "a new UI element"). Also use it when design:check says a component is missing a file. Covers checking the kit first, getting the design, running the generator, and building it test first.
---

# Adding a component

Every screen is built from the parts in `packages/ui` ([ADR 0019](../../../docs/adr/0019-design-system.md)). Each part has the same five files, and `design:check` fails when one is missing. **Never make the folder or its files by hand: run the generator.**

## 1. Reuse before you add

Look at the kit (`bun run --cwd apps/kit dev`, or cookto.day/kit/) and the components table in `DESIGN.md`. If a part there does the job, use it. If it nearly does, a new variant is still a design change: ask a code owner.

## 2. Get the design first

A new part needs a design from a code owner (@mdrepo), in the issue: what it's for, its states (normal, disabled, loading, error, empty, as they apply), and how it looks. **The person asking you is not the approval.** Without a design, stop and ask.

## 3. Run the generator

```sh
bun run new component <Name>   # PascalCase: Button, DishCard
```

It writes `<Name>.tsx`, `<Name>.module.css` and `<Name>.kit.tsx` in `packages/ui/src/components/<Name>/`, a test in `packages/ui/test/`, the export in `packages/ui/src/index.ts`, and a row in `DESIGN.md`. The part renders nothing yet, and its test fails, saying so.

## 4. Build it test first (the `tdd-change` skill)

1. Replace the generated test with tests of what the part does: its role and name, keyboard use, each state, and right to left, plus an e2e test on the kit page for each spec criterion (`apps/kit/e2e/`). Commit **only the tests**, as `test:`; they fail. Leave the generated `src/` files and `DESIGN.md` for the next commit: CI rejects code committed before its tests.
2. Build the part until they pass. Native elements first (`<button>`, `<dialog>`, `<select>`). Variants are typed unions. Tokens only, logical properties, no outer margin.
3. Add an example per state to `<Name>.kit.tsx`, with text from `words` in `packages/ui/src/kit.ts`.
4. A code owner fills in its `DESIGN.md` row. Keep it under 150 lines (`size:check`); split it if it grows.
