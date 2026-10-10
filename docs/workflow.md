# How to make a change (for people working with an AI agent)

This is the long version of the workflow in [`AGENTS.md`](../AGENTS.md), written for the person driving the agent. You don't need to judge whether the code is good: the repo's checks do most of that. Your job is to follow the steps, read what the checks say, and bring the right things to a code owner (@mdrepo).

The rules come from [ADR 0002](adr/0002-tdd-workflow.md) (the workflow), [0003](adr/0003-testing-policy.md) (tests) and [0004](adr/0004-e2e-runs-locally.md) (e2e).

## Before you start (once)

```sh
bun install                        # also turns on the git hooks
bunx playwright install chromium   # the browser for e2e tests
brew install gitleaks              # secret scanning in the pre-commit hook
bun run check && bun run e2e       # everything should pass on a fresh clone
```

Use the Bun version in `package.json` (`packageManager`).

**On Windows,** before you clone: turn on Developer Mode (Settings → System → For developers) and run `git config --global core.symlinks true`, because `.claude/skills/` holds symlinks. Install gitleaks from its [releases page](https://github.com/gitleaks/gitleaks/releases). Line endings are handled by `.gitattributes`.

## The loop

```
issue ──► 0. spec PR ──► owner merges it ──► 1. red (failing tests) ──► 2. green (code) ──► 3. refactor ──► 4. verify ──► PR ──► owner review ──► squash-merge
```

| Step | You ask the agent to... | You check | What enforces it |
|---|---|---|---|
| 0. Spec | write `specs/<issue>-<name>.md` from the issue and open a PR with only that file | it describes what people see, in plain words, and lists new words | the agent stops and waits |
| Approve | (a code owner reviews the spec PR) | the owner merged it | GitHub: `specs/` needs a code owner. CI fails a code PR whose issue has no spec on `main` |
| 1. Red | write one failing e2e test per criterion, plus unit tests for new pure functions, and commit only tests | the tests fail for the reason in the spec | `tdd:verify` proves new tests fail on `main` and pass here: unit tests in CI, e2e in your pre-push hook. CI checks the `test:` commit comes first |
| 2. Green | make the tests pass with the smallest change | no test file changed | CI fails a non-`test:` commit that touches tests and flags a later `test:` commit; tests need a code owner (CODEOWNERS) |
| 3. Refactor | tidy up, if needed | tests still pass | same as green |
| 4. Verify | run the checks and open the PR | all green; video and screenshots for UI changes | CI runs `check`, PR rules, audit and secret scanning; e2e runs in your pre-push hook |

## Worked example: issue #12, "spinach bought 4 days ago is suggested first"

*(An example of the loop. The suggestions screen doesn't exist yet.)*

**The issue:** a household added a Zepto bill on Monday with spinach (palak) and paneer, and a BigBasket bill on Thursday with potatoes and cauliflower. On Friday, cookto.day suggests Aloo Gobi first, and the spinach goes off.

### 0. Spec

Paste to the agent:

> Write the spec for issue #12 (`gh issue view 12`).

The agent writes `specs/12-spinach-first.md` on a branch `12-spec`, opens a PR with only that file, and **stops**. A good spec here has:

- *Criterion 1:* given spinach bought 4 days ago (keeps 5 days) and potatoes and cauliflower bought yesterday, when they open today's suggestions, then Palak Paneer comes before Aloo Gobi.
- *Criterion 2:* Palak Paneer says "Spinach: use by tomorrow" (and the same in Hindi, Marathi and Arabic).
- *Words:* "use by tomorrow", "use today".
- a question for the owner: how long does spinach keep? Is 5 days right for a fridge in Pune and one in Dubai?

A code owner reviews the spec PR, answers the questions (in the PR or the issue), and merges it. **Don't let the agent continue until it's merged.** This is where wrong requirements are cheapest to fix.

### 1. Red

> The spec for #12 is merged (spinach keeps 5 days). Go ahead.

The agent:

- adds `e2e/suggestions.spec.ts` with one test per criterion, named in the spec's words
- adds unit tests in `test/unit/` for the new pure function that ranks dishes (it already has `daysLeft` from `src/lib/expiry.ts`)
- runs them, and shows them **failing** because the ranking doesn't exist
- commits only the tests: `test: spinach bought 4 days ago is suggested first`

If the agent starts editing code before committing the tests, stop it and ask it to commit the tests first.

### 2. Green

The agent adds the ranking in `src/lib/`, the words in all four `src/i18n/` files, and the warning on the dish card, using `DESIGN.md`'s tokens. It runs the tests until they pass and commits `feat(suggest): suggest dishes that use what's about to go off`.

**If the agent wants to change a test now**, Claude Code asks you to approve it. Say no unless the agent can explain what's wrong with the *test* (not "it doesn't match my code"). If you're unsure, ask a code owner. A test changed after the code is flagged on the PR for the owner anyway.

**If the agent wants a new look** (there's no "use it today" warning in `DESIGN.md` yet), it should stop and ask. `design:check` fails on a colour it made up.

### 4. Verify

```sh
bun run check       # dependencies, agent files, design, format, types, lint, dead code, tests, size budget
bun run e2e         # all browser tests, offline
bun run tdd:verify  # the new tests fail on main and pass here
```

`tdd:verify` should end with something like:

```
✓ e2e/suggestions.spec.ts: spinach bought 4 days ago is suggested first  (main: fail, branch: pass)
✓ e2e/suggestions.spec.ts: the dish says when the spinach must be used  (main: fail, branch: pass)
✓ test/unit/rank.test.ts: ranks by the ingredient that goes off first  (main: fail, branch: pass)
```

Push, and open the PR with the template: title `feat(suggest): suggest dishes that use what's about to go off`, `Closes #12`, the `tdd:verify` output, the video from `test-results/`, and screenshots in light and dark, in English and Arabic.

## When something fails

| You see | It means | Do this |
|---|---|---|
| `tdd:verify`: a test **PASSES on main** | the test doesn't check the new behaviour | ask the agent to make it check what the spec says, in a new `test:` commit explaining why |
| `tdd:verify`: a test **FAILS on this branch** | the code isn't done | ask the agent to fix the code, **not** the test |
| `check` fails on lint, types or knip | the code has a real problem | ask the agent to fix the cause. Don't accept `eslint-disable`, `@ts-expect-error` or config edits |
| typecheck: a property is missing in `hi.ts` / `mr.ts` / `ar.ts` | a new word wasn't translated | ask the agent to add it to every language |
| `design:check` fails | a colour, size or direction that isn't in `DESIGN.md` | use a token; if none fits, a code owner decides the design |
| the page size budget fails | the page or its scripts grew too much | make the change smaller. Only a code owner raises a budget |
| `deps:check` / `deps:health` fails | a package was added | the agent should not add packages. See the `add-dependency` skill; a code owner decides |
| PR rules: "No approved spec for #N on main" / "doesn't link its issue" | the spec PR wasn't merged first, or `Closes #N` is missing | merge the spec PR first (an owner), or add `Closes #N` |
| PR rules: "no test: commit before src/" | steps were skipped | redo the steps in order on a new branch (ask an owner if stuck) |
| PR rules: "Decision section of an accepted ADR was edited" | a past decision was changed | undo it. Changing a decision needs a new ADR that an owner approves |
| A git hook fails on commit or push | the same check would fail in CI | fix what it reported. Skipping it with `--no-verify` only moves the failure to the PR |

## Changes that skip the spec and red steps

Docs, dependency bumps, pure refactors covered by existing tests, and tooling don't change behaviour. Their PR description has one line saying so, for example:

```
Exemption: refactor - moves the language switch into its own module; the e2e tests cover it
```

If in doubt, it's a behaviour change.

## What only a code owner can do

- approve a spec (by merging its PR)
- approve a test change made after the code
- approve a new dependency, or an exception in `dependency-allowlist.json`
- change an ADR, `DESIGN.md`, a check, CI, the hooks or the agent guidance (`.github/CODEOWNERS` lists the files)
- approve and merge the PR (merging deploys it, ADR 0014)

## Words used here

| Word | Meaning |
|---|---|
| issue | a GitHub issue: where every change starts (templates: Task, Bug) |
| spec | `specs/<issue>-<name>.md`: what people should see, as Given/When/Then |
| red / green | tests failing first, then passing after the code change |
| exemption | a change with no behaviour change, which skips the spec and red steps |
| token | a design variable in `src/styles.css`, listed in `DESIGN.md` |
| code owner | @mdrepo; GitHub requires their approval |
