# #48: React Compiler memoises the app, and lint stops memoising by hand

- **Issue:** #48
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are whoever builds cookto.day, people and agents. On cheap phones, every render that changes nothing costs battery and makes taps slow. [ADR 0023](../docs/adr/0023-state-and-rerenders.md) lets React Compiler do the memoising, so code stays plain and nobody gets a dependency list wrong. Agents add `useMemo` by habit, so lint must stop it, and the compiler's own lint rules must flag code it can't make fast.

## Acceptance criteria

Each criterion becomes one test: the build ones in `apps/web/test/build/`, the lint ones in `tooling/test/`, which lint a few lines as if they sat in a `.tsx` file (ADR 0002, 0003).

### 1. the app is memoised without anyone writing it

- **Given** the app's components, with no `useMemo`, `useCallback` or `memo` in them
- **When** the site is built
- **Then** the app's script uses React Compiler's memo cache
- **And** the page is still readable before its script runs, the same as before (the existing build tests), and stays within its budgets

### 2. memoising by hand fails lint, saying the compiler does it

- **Given** a component or hook
- **When** it calls `useMemo`, `useCallback` or `memo` (or `React.memo`)
- **Then** lint fails, saying React Compiler memoises for you, and if one is really needed, to disable this line with a reason (ADR 0023)

### 3. React's compiler rules run

- **Given** a component
- **When** it sets state inside an effect to work out a value, or reads a ref while rendering
- **Then** lint fails with React's own rule for it (`react-hooks/set-state-in-effect`, `react-hooks/refs`)

### 4. a focused test in a `.tsx` file is still caught

- **Given** a test file ending in `.tsx`, like `packages/ui/test/Button.test.tsx`
- **When** it has `test.only(...)` or `describe.skip(...)`
- **Then** lint fails, as it already does in `.ts` files (ADR 0003)

## Words

None for the app. Lint messages are for whoever builds cookto.day, in English, and name ADR 0023 or 0003.

## Out of scope

- Zustand, TanStack Query and render-count tests: they come with the settings repository and the first feature that reads saved data.
- Checking that every disable comment gives a reason: ESLint has no built-in rule for it. The message asks for one, and review checks it.
- `eslint-plugin-react-hooks` 7 has one npm maintainer, so its allowlist entry gets a code-owner exception, as Lucide's did (ADR 0020). It runs only in lint and never ships to users.
