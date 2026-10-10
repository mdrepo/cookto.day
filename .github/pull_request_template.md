<!-- The PR title becomes the commit message on main: "type(scope): summary" (ADR 0009). -->

## What and why

<!-- One or two sentences. -->

Closes #

## Spec

<!-- specs/<issue>-<short-name>.md, already merged to main (that merge was the owner's approval). Or delete this section and claim an exemption below. -->

## Exemption

<!--
Only if there's no behaviour change (ADR 0002). Keep exactly one line, e.g.:
Exemption: refactor - moves code; the existing e2e tests cover it
Kinds: docs, dependencies, refactor, tooling. Otherwise delete this section.
-->

## Evidence

- [ ] `bun run check` passes
- [ ] `bun run tdd:verify` shows the new tests fail on main and pass here (paste the summary)
- [ ] `bun run e2e` passes
- [ ] UI change: video attached (from `test-results/`), and screenshots in light and dark, in English and Arabic

## Notes for the reviewer

<!-- Anything you were unsure about, and any test you changed after writing the code (and why). -->
