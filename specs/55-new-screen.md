# #55: A new screen starts from one command, with a test that counts re-renders

- **Issue:** #55
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. Screens come next: onboarding, then bills, the pantry and the week plan. Each needs a feature folder laid out the way the layers say ([ADR 0022](../docs/adr/0022-app-layers.md)), and a hook whose re-renders are tested ([ADR 0023](../docs/adr/0023-state-and-rerenders.md)). One command makes them right the first time, as `new component` does for the kit.

## Acceptance criteria

Criteria 1–3 are tests in `tooling/test/`, run against a copy of the repo, like `new component`'s. Criterion 4 is a unit test of the helper (ADR 0002, 0003).

### 1. a new screen starts with every file it needs

- **Given** there is no `onboarding` feature
- **When** someone runs `bun run new screen onboarding`
- **Then** these exist:
  - `apps/web/src/features/onboarding/OnboardingScreen.tsx`, the screen;
  - `apps/web/src/features/onboarding/useOnboardingScreen.ts`, its hook;
  - `apps/web/test/features/onboarding/useOnboardingScreen.test.ts`, the hook's test, which counts re-renders;
  - `apps/web/e2e/onboarding.spec.ts`, the screen's e2e test
- **And** the typecheck, lint (with the layer rules) and Prettier pass with them

### 2. a new screen's tests fail until it's built

- **Given** a screen the generator just made
- **When** its hook's test and its e2e test run
- **Then** both fail, saying what to write first: the hook's test from the spec, and the screen's e2e test from the spec (ADR 0002)

### 3. a name that's taken, or not a feature name, is refused

- **Given** a `settings` feature already exists
- **When** someone runs `bun run new screen settings`, or `bun run new screen Onboarding`, or `bun run new screen "week plan"`
- **Then** nothing is written, and they're told why: the name is taken, or a feature's name is lower-case words joined by `-`, like `week-plan` (which makes `WeekPlanScreen`)

### 4. a hook's re-renders can be counted

- **Given** a hook that reads one value from a store, through a selector
- **When** a test mounts it with `renderCount`, and the store changes a value the hook doesn't read, then one it does
- **Then** the hook ran once for the first mount, not again for the first change, and once more for the second, and returns the new value

`renderCount` lives in a new workspace, `@cookto/testing` (`packages/testing`), for test helpers every app and package can share. It mounts the hook in happy-dom with React's `act`, so it needs no browser.

## Words

None for the app. The generator's messages are for whoever builds cookto.day, in English.

## Out of scope

- Putting the screen in the app: there's no navigation between screens yet. It comes with onboarding, which needs it first.
- A use case per screen: use cases are grouped by domain, not screen (ADR 0022), so the generator doesn't make one.
- The `add-screen` agent skill ships with the generator, in the same PR. It has no test: it tells agents to run the command.
