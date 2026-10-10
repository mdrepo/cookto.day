# 0006. Dependency allowlist and health thresholds

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

AI agents add packages freely, often small, unmaintained or single-maintainer ones. We want a deterministic gate on what gets added, alongside the supply-chain layers in [0005](0005-supply-chain-policy.md).

## Decision

**Allowlist.** Every direct dependency must be listed in `dependency-allowlist.json` with a one-line reason. `bun run deps:check` (part of `bun run check`) fails when `package.json` and the list disagree. Changing the list needs a code owner's approval (CODEOWNERS).

**Health check.** When a PR adds or changes a direct dependency, `bun run deps:health` looks it up on deps.dev and the npm registry:

| Check | Threshold | On failure |
|---|---|---|
| OpenSSF Scorecard of the source repo | ≥ 5 | Fail |
| Most recent release | Within 12 months | Fail |
| npm maintainers | ≥ 2 | Fail |
| Install scripts (`preinstall`, `install`, `postinstall`) | None | Fail |
| License | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC | Fail |
| npm provenance attestation | Present | Warn |
| New transitive packages added | ≤ 20 | Warn |

**Exceptions.** A package that fails a check can still be allowed with an `exceptions` entry in the allowlist naming the check and saying why. Exceptions need a code owner's approval like any other allowlist change. The check reports exceptions that are no longer needed.

## Alternatives

- **Manual review only:** inconsistent, and easy to wave through under time pressure.
- **Weekly downloads as a threshold:** popularity does not mean safety; hijacks target popular packages.
- **Apply thresholds to the whole transitive tree:** too noisy; only a count is checked there.

## Consequences

- Adding a package takes a deliberate step, which is the point.
- The health check depends on deps.dev and the npm registry. It runs as its own CI job, not a required one, so their outages don't block merging; code owners review dependency changes anyway.
