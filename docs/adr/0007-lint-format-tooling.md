# 0007. Lint and format: ESLint + typescript-eslint + Prettier, TypeScript 6

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Code quality must be enforced deterministically, not by review alone. The most valuable rules need type information: unawaited promises, unsafe `any`, needless conditions, misused async functions. Agents also leave behind unused files, exports and dependencies.

TypeScript 7.0 shipped without the programmatic compiler API that typescript-eslint depends on; that API is expected in TypeScript 7.1.

## Decision

- **Linting:** ESLint with `typescript-eslint`'s `strictTypeChecked` preset. Project rules are ESLint rules too, not a separate script:
  - no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` or `new Function` (bill text is untrusted input)
  - no `fetch` or `XMLHttpRequest` in `src/` ([0013](0013-static-browser-only.md))
  - no `console.log` in `src/`
  - no `@ts-ignore`; `@ts-expect-error` needs a description
  - no `.skip` / `.only` in tests
  - at most 300 lines per file and 80 per function (tests are exempt from the function limit)
- **Formatting:** Prettier with default settings, except Markdown (Prettier would only realign tables). ESLint has no formatting rules, so no bridge package is needed.
- **TypeScript:** pin TypeScript 6.x until typescript-eslint supports TypeScript 7.1, then write a superseding ADR. `tsconfig.json` is `strict` and adds `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax`, and sets `types` explicitly.
- **Dead code:** knip fails on unused files, exports and dependencies, and on dependencies used but not declared.
- `bun run check` runs all of them, with the other checks.

## Alternatives

- **Biome:** fast and a single binary, but most of its rules are not type-aware, and running it next to ESLint means two rule sets.
- **TypeScript 7 without type-aware linting:** loses the rules that catch the most real bugs.
- **Both TypeScript 6 (for ESLint) and 7 (for `tsc`):** two compilers that can disagree.

## Consequences

- Slower type checking than TypeScript 7 until the upgrade.
- If a file ever has to go over a limit, it gets a cap at its current size in `eslint.config.js` that may shrink and never grow, the same ratchet as [0011](0011-design-guide-and-check.md).
