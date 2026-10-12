# 0023. Keep each kind of state in one place, and test what re-renders

- **Status:** Accepted
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

cookto.day runs on cheap phones. Every render that changes nothing costs battery and makes taps feel slow. [0022](0022-app-layers.md) put screens, hooks, use cases and data in layers; this ADR says where state lives inside them, and how we keep re-renders few. Advice alone doesn't hold: agents wrap things in `useMemo` by habit, put state at the top "just in case", and use context for everything. So each rule here is a lint rule or a test.

A spike (12 Oct 2026) found that Bun 1.4.2 has React Compiler built in (`Bun.build({ reactCompiler: true })`). On our app it added no build time, 1.3 KB gzipped, and 52 automatic memo caches; every unit, budget and e2e test passed, and the prerendered HTML was unchanged.

## Decision

**Each kind of state has one home:**

| State | Example | Home |
|---|---|---|
| Saved data | Pantry, bills, the week plan | `packages/data` ([0022](0022-app-layers.md)), read through screen hooks |
| App-wide settings | Language, household, sync status | One Zustand store, `packages/data/store` |
| A screen's own state | An open sheet, text being typed | `useState` in the lowest component that needs it |
| Where you are | Which screen, which day | The URL |

**Zustand for the store** (`zustand`, exact version, in the allowlist). Its core has no React (`zustand/vanilla`), so the store sits in `packages/data` with the rest of the data, and a React Native app reuses it. Hooks read it through `useStore(selector)`.

**React Compiler does the memoising.** `reactCompiler: true` in every browser bundle, `reactCompilerOutputMode: "ssr"` in the prerender bundles. Nobody writes `useMemo`, `useCallback` or `memo` by hand; when one is really needed, it sits behind a lint-disable comment that says why.

**Six rules, each checked:**

| Rule | Why | Checked by |
|---|---|---|
| 1. Read the store only through a selector, which returns one value or uses `useShallow` | A part re-renders only when the value it reads changes | Lint: `useStore()` without a selector fails |
| 2. Only screen hooks read the store and data | Selectors live in known places, where tests can count them | Lint, from [0022](0022-app-layers.md) |
| 3. No React context for values that change | A context change re-renders everything below it | Lint: `createContext` fails outside `packages/ui`, which may use it for what never changes per screen (direction, theme) |
| 4. Don't compute state in `useEffect` | An effect that sets state renders twice | Lint: `react-hooks` 7's compiler rules (`set-state-in-effect`, `purity`, `refs` and more) |
| 5. List keys are ids, never positions | One added item must not redraw the list | Lint: a `key` of `i`, `idx` or `index` fails |
| 6. Unchanged data keeps the same object | When 1 of 100 items changes, 99 keep their identity and don't redraw | Unit tests in `packages/data` |

**Render-count tests are the guard behind all six.** Since only hooks read state ([0022](0022-app-layers.md)), counting a hook's renders counts its component's. A test helper, `renderCount(hook)`, renders the hook alone, makes a change, and returns how many times it ran. Each screen hook has tests in the user's words:
- "Typing in the pantry search re-renders the list, not the header."
- "A login token refresh re-renders nothing."
- "Changing one pantry item re-renders that item's row only."

`bun run new screen` writes the first of these with the hook.

**`eslint-plugin-react-hooks` moves to 7.** Its `recommended` set includes the compiler's rules, which flag code the compiler can't make fast. It has one npm maintainer, so the allowlist gets a code-owner exception, as Lucide did ([0020](0020-icons-lucide.md)). It runs only in lint and never ships to users.

## Alternatives

- **Our own small store** on `useSyncExternalStore`: about 60 lines, no dependency, but we would document and maintain it, and agents don't know it. Zustand is small, has no dependencies of its own, and agents know it.
- **Redux Toolkit:** more code and ceremony than one store of settings needs.
- **Jotai or signals:** fine-grained, but a different way of thinking from the rest of React, and harder to test through `renderCount`.
- **TanStack Query for saved data:** built for server data. Ours is on the device first; the data ADR decides how it's read.
- **`useMemo` and `useCallback` by hand:** one wrong dependency gives stale data or saves nothing, and the code doubles. The compiler does it right.
- **React Compiler through Babel:** 41 packages and half a second per build, and it broke on Babel 8. Bun's built-in option needs neither.

## Consequences

- Plain code: no memo wrappers, no providers stacked at the top of the app.
- A slow re-render shows up as a failing test with a name, not as a feeling on a cheap phone.
- We depend on Bun's compiler option and Zustand. If either goes, the rules stay and the tool changes.
- Revisit if render-count tests become brittle, or if the compiler's output grows past our script budget.
