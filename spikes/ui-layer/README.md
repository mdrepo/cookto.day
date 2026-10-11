# Spike: plain functions or Preact for the UI layer

A throwaway branch, never merged. It answers one question for ADR 0016: build the UI with plain TypeScript functions (ADR 0005, no runtime dependencies) or with Preact?

**Method.** Onboarding step 1 ("Who's in the family?") is the most stateful screen in the prototype: a name you type that updates the list as you type, a card that opens and closes, add, remove, and right to left. It was built twice:

- `vanilla/main.ts`: plain functions, written to keep focus and the caret: the screen is built once and each change updates only what differs.
- `preact/main.tsx`: Preact 11.0.0.

Both use the same state (`shared/family.ts`), the same CSS (`shared/style.css`) and the same markup, so only the view layer differs. `e2e/step1.spec.ts` runs against both.

```sh
cd spikes/ui-layer && bun build.ts && bunx playwright test -c playwright.config.ts
```

## Results

|                                                 | Plain functions                        | Preact                                     |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| e2e (6 tests, including the caret while typing) | 6 pass                                 | 6 pass                                     |
| View code (lines, without blanks and comments)  | 269                                    | 179 (33% fewer)                            |
| JavaScript shipped, gzipped                     | 1.9 KB                                 | 7.3 KB                                     |
| Share of the 20 KB script budget                | 10%                                    | 36%                                        |
| Strict lint and types                           | clean                                  | clean                                      |
| ADR 0006 health check                           | n/a                                    | passes                                     |
| Code paths per component                        | two: build, then update                | one: render                                |
| Footguns found                                  | moving a node blurs it; writing an input's value moves the caret | handlers must read the latest state (`stateRef`) |

**The tests catch the bug that matters.** A naive plain-functions version that redraws everything on each change fails "typing a name … keeps the caret" (focus is lost on the first keystroke) and passes the rest. So either choice is safe as long as every screen with an input has that test.

## What it means

- **Plain functions** stay tiny and dependency-free, but every component needs a build path and an update path that must agree. That's the code an agent is most likely to get subtly wrong, and the gap grows with the screens still to come: swipe cards, the drag-and-drop week, sheets.
- **Preact** removes that class of bug by construction and is a third shorter, but it is a runtime dependency (against ADR 0005) and a third of the script budget, whose comment says it leaves "no room for a framework".

Either way is a code owner's call: a new dependency, and a budget, are on AGENTS.md's stop-and-ask list.
