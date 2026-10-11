# Specs

One file per behaviour change, named after its GitHub issue: `specs/<issue>-<short-name>.md`, e.g. `specs/12-spinach-first.md`. Copy [`TEMPLATE.md`](TEMPLATE.md). `1-first-visit.md` is a small worked example: the first feature, built this way.

This is phase 0 of the TDD workflow ([ADR 0002](../docs/adr/0002-tdd-workflow.md)):

1. Write the acceptance criteria as Given/When/Then, in the user's words.
2. Open a PR that contains **only** the spec. A code owner reviews it; **merging it is the approval**. Agents stop here and wait.
3. Then, on a new branch from `main`, each criterion becomes one failing e2e test (phase 1, Red), and the code PR says `Closes #<issue>`.

CI fails a code PR that changes app code (`apps/*/src/`, `packages/*/src/`) unless its issue's spec is already on `main`, or the PR claims an exemption.
