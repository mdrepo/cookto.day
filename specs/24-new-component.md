# #24: A new component starts with every file it needs, from one command

- **Issue:** #24
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. Today a new component means making five files by hand, the same way every time, and `design:check` fails until they're all there. One command should make them right the first time, so the easy way and the checked way are the same way.

## Acceptance criteria

This is tooling, not a screen, so each criterion becomes one test in `tooling/test/`, run against a copy of the repo (ADR 0002, 0003).

### 1. a new component starts with every file it needs

- **Given** there is no `Button` component
- **When** someone runs `bun run new component Button`
- **Then** `packages/ui/src/components/Button/` has `Button.tsx`, `Button.module.css` and `Button.kit.tsx`, `packages/ui/test/Button.test.tsx` exists, and DESIGN.md has a row for `Button`
- **And** `design:check`, `size:check`, the typecheck and lint pass with them
- **And** it's exported from `@cookto/ui`, so the kit page shows it

### 2. a new component's test fails until it's built

- **Given** a component the generator just made
- **When** its test runs
- **Then** it fails, saying the component renders nothing yet, so the first real change is making it pass (ADR 0002)

### 3. a name that's taken, or not a component name, is refused

- **Given** a `Select` component already exists
- **When** someone runs `bun run new component Select`, or `bun run new component button`
- **Then** nothing is written, and they're told why: the name is taken, or a component's name starts with a capital letter, like `Button`

## Words

None for the app. The generator's messages are for whoever builds cookto.day, in English.

## Out of scope

- `new layout` and `new screen`: they come with layouts (ADR 0019, step 4).
- Designing the component. The DESIGN.md row says "Not designed yet: ask a code owner", until one fills it in.
- The `add-component` agent skill ships with the generator, in the same PR. It has no test: it tells agents to run the command.
