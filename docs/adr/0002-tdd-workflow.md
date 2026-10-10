# 0002. TDD workflow: Spec → Red → Green → Refactor → Verify

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Most code will be written by AI agents. Their common failure modes are: tests written after the code that pass without testing anything, tests edited until they pass, and large speculative changes. Written guidance alone doesn't stop these, so each phase needs a check a script can verify.

## Decision

Every behaviour change follows these phases:

| Phase | What happens | Gate |
|---|---|---|
| **0. Spec** | Write acceptance criteria as Given/When/Then in `specs/<issue>-<name>.md`, in a PR of its own. | A code owner merging the spec PR is the approval. CI fails a code PR that changes `src/` unless its issue's spec is already on the base branch. |
| **1. Red** | One e2e test per acceptance criterion, plus unit tests for any new pure function ([0003](0003-testing-policy.md)). Commit test files only, with a `test:` message. | `bun run tdd:verify` confirms the new tests fail against `main`'s source. CI checks a `test:` commit comes before the first `src/` commit. |
| **2. Green** | The smallest implementation that makes the tests pass. Test files must not change. | CI fails a non-`test:` commit that touches tests, and flags any `test:` commit after the code for human review. |
| **3. Refactor** | Tidy up while staying green. Test files still must not change. | Same as Green. |
| **4. Verify** | `bun run check` and `bun run e2e` pass; attach a video for UI changes; open a PR using the template. | Pre-push hook and CI. |

**`bun run tdd:verify`** takes the tests the branch added or changed and runs them against `main`'s source (they must fail) and against the branch's source (they must pass).

**When a test was genuinely wrong:** fix it in a separate `test:` commit whose message explains why. The PR is then flagged for human review of that change.

Exempt from Spec and Red: changes with no behaviour change (docs, dependency bumps, pure refactors covered by existing tests, tooling). The PR must say which, on one line: `Exemption: <kind> - <why>`. CI warns the reviewer when an exemption is claimed on a PR that changes `src/`.

## Alternatives

- **Trust commit order alone:** easy to fake by committing tests and code together, or reordering.
- **Coverage thresholds as the main gate:** coverage shows lines ran, not that behaviour was checked; agents reach any threshold with assertion-free tests.
- **No spec approval step:** agents then decide the requirements themselves, which is where most slop starts.

## Consequences

- Every behaviour change is proven to go from failing to passing.
- Slower for trivial changes; the exemptions keep this bounded.
- `tdd:verify` runs tests against `main`'s source in a temporary git worktree.
- A red commit may import code that doesn't exist yet, so the pre-commit hook skips the typecheck for a tests-only commit ([0008](0008-git-hooks-without-dependencies.md)); CI checks the PR's head.
