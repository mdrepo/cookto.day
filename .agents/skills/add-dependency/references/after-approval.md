# Adding a dependency after an owner approved it

Read this only once a code owner has approved this specific package. If they haven't, go back to the skill's step 2.

1. `bun add -d <pkg>` for a dev tool. A runtime package (`bun add <pkg>`) also needs the ADR that allows it, merged first. `bunfig.toml` pins the exact version and refuses releases younger than 7 days, so if the newest version is refused, take the one it offers.
2. Add an entry to `dependency-allowlist.json` with a one-line `reason`, and who approved it.
3. `bun run deps:health`. For each `FAIL` (scorecard, recent-release, maintainers, install-scripts, license), stop and tell the owner. Only they decide whether to accept it. If they do, record it under `exceptions` with the check's name and their reason. Never write an exception yourself to make the check pass.
4. **Never add the package to `trustedDependencies`**: that would let its install scripts run.
5. `bun run check`. knip fails if the package is unused, or if code uses a package that isn't declared; the size budget fails if it makes the page too heavy.

## Upgrades

`deps:health` checks the new version the same way. Security fixes still wait 7 days unless an owner overrides it for that upgrade, and the PR must say so. Bumps are a no-behaviour-change PR: `Exemption: dependencies - <pkg> <old> → <new>`, as `build(deps): ...`.
