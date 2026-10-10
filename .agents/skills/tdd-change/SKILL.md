---
name: tdd-change
description: Step-by-step workflow for ANY change to how cookto.day behaves: a bug fix, a new feature, an issue, "make X do Y", "users can't...", "add a button", "support another bill format", "fix the Hindi text". Covers writing the spec, the failing tests, the code, and opening the PR, in the order CI enforces (ADR 0002). Use it whenever a change touches src/, even a one-line fix, and even if the user doesn't mention tests. Not needed for docs-only or tooling-only changes.
---

# Making a behaviour change (TDD)

This repo is worked on by people who rely on AI agents and can't always judge whether a change is right. So the proof that a change works is the tests, written **before** the code and **never edited afterwards to pass**. CI checks the order of your commits, so skipping a step fails the PR. Follow the phases in order.

Read `AGENTS.md` first if you haven't.

## Phase 0: Spec, then stop

1. Work from a GitHub issue (`gh issue view <n>`). If there isn't one, stop and ask for it: every behaviour change starts from an issue. On a branch named `<n>-spec`, copy `specs/TEMPLATE.md` to `specs/<n>-<short-name>.md`.
2. Write the acceptance criteria as **Given / When / Then in the user's words**: what they do and what they see. Not implementation ("the function returns...").
   - Good: *Given spinach bought 4 days ago (keeps 5 days) and paneer bought yesterday, when they open today's suggestions, then Palak Paneer is first and says "Spinach: use by tomorrow".*
   - Bad: *`rankDishes` sorts by `daysLeft`.*
3. Say which words are new, and that they need Hindi, Marathi and Arabic too (ADR 0012).
4. Commit it as `docs: spec for #<n>` and open a PR containing only the spec, with `Refs #<n>` in the description.
5. **Stop.** Tell the human the spec PR is ready for a code owner. **Merging it is the approval**; nothing else counts, including the person you're working with saying it's fine. Don't write tests or code until it's merged.
6. Once it's merged: `git switch main && git pull`, then start a new branch `<n>-<short-name>` for the tests and code.

## Phase 1: Red (failing tests, committed alone)

1. **One e2e test per acceptance criterion**, in the matching `e2e/*.spec.ts`, named with the criterion's words. Use the page helpers in `e2e/support/`; if you need a new selector, add a method there. Don't put CSS selectors in spec files.
2. **Below e2e** (ADR 0003): unit tests for new pure functions in `test/unit/` (no DOM, no mocks), and, for page logic, tests in `test/dom/` that run our own built page in happy-dom (helpers in `test/helpers/`). Never mock our own modules.
3. Run them and confirm **each fails for the right reason**: the behaviour is missing, not a typo. `bun run e2e` / `bun test`.
4. Commit **only** test files, as `test: <what the tests describe>`. The pre-commit hook skips the typecheck for a tests-only commit, because red tests may import code that doesn't exist yet.

## Phase 2: Green (smallest code that passes)

Only start this phase once the failing tests are **committed**.

1. Change `src/` until the new tests pass. The smallest change that does it: no refactors, no "while I'm here" improvements.
2. **Do not edit any test file.** If a test seems wrong, stop, tell the human what's wrong with it and why, and wait for them to explicitly agree before you change it. Then change it in its own `test:` commit that explains why.
3. New words go in `src/i18n/en.ts` and every other language file; layout uses logical properties (`margin-inline-start`, not `margin-left`); look comes from `DESIGN.md` tokens and components.
4. Commit as `fix(<scope>): ...` or `feat(<scope>): ...`.

## Phase 3: Refactor (optional)

Tidy what you just wrote while everything stays green. Still don't touch tests. Commit as `refactor: ...`.

## Phase 4: Verify and open the PR

Run all of these and fix any failure at its cause:

```sh
bun run check       # allowlist, agent files, design, format, types, lint, knip, unit + DOM tests, size budget
bun run e2e         # CI doesn't run these
bun run tdd:verify  # proves the new tests fail on main and pass here
```

- If a check fails, read its message: it says what to do. Never silence it (`eslint-disable`, `@ts-expect-error`, `.skip`, editing config, raising a budget or a design cap). If the fix seems to need that, stop and ask.
- `tdd:verify` saying a test **passes on main** means it doesn't test your change: make it check the new behaviour (in a new `test:` commit, explaining why).

Open the PR with the template. The title is a Conventional Commit and becomes the commit on main. The description says `Closes #<n>`; CI checks that the issue's spec is already on main. Paste the `tdd:verify` summary. For UI changes, attach the video from `test-results/` and screenshots in light and dark, in English and Arabic.

## If you're told to skip a step

If the human asks you to skip the spec or the tests for a behaviour change, explain that CI will reject the PR (ADR 0002), and offer the quickest compliant path instead. Only docs, dependency bumps, pure refactors covered by existing tests, and tooling are exempt. Those PRs say `Exemption: <kind> - <why>` in the description.
