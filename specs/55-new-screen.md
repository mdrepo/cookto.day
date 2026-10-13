# #55: A new screen starts from one command, with a test that counts re-renders

- **Issue:** #55
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. Screens come next: onboarding, then bills, the pantry and the week plan. Each needs a feature folder laid out the way the layers say ([ADR 0022](../docs/adr/0022-app-layers.md)), and a hook whose re-renders are tested ([ADR 0023](../docs/adr/0023-state-and-rerenders.md)). One command makes them right the first time, as `new component` does for the kit.

## What the command does

Not tested: it's checked by hand once, in this PR. Its output is checked anyway, the first time anyone commits a screen it made (typecheck, lint with the layer rules, Prettier, tdd:verify).

- `bun run new screen onboarding` writes:
  - `apps/web/src/features/onboarding/OnboardingScreen.tsx`, the screen;
  - `apps/web/src/features/onboarding/useOnboardingScreen.ts`, its hook;
  - `apps/web/test/features/onboarding/useOnboardingScreen.test.ts`, the hook's test, which counts re-renders;
  - `apps/web/e2e/onboarding.spec.ts`, the screen's e2e test.
- Both tests fail until the screen is built, saying what to write first, from the screen's spec (ADR 0002).
- A taken name (`settings`) or one that isn't lower-case words joined by `-` (`Onboarding`, `"week plan"`) is refused, saying why. `week-plan` makes `WeekPlanScreen`.

## Acceptance criteria

One unit test (ADR 0002, 0003).

### 1. a hook's re-renders can be counted

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
