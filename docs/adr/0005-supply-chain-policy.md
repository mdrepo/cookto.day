# 0005. Supply-chain policy: no runtime dependencies

- **Status:** Superseded by 0018
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

npm packages are a common attack path, including hijacked popular packages (for example `chalk` and `debug` in September 2025) and self-spreading worms that run through install scripts. cookto.day reads people's grocery bills, with their names, addresses and phone numbers on them, in their browser, so a compromised package that ships to users is the worst case. Health checks ([0006](0006-dependency-health-check.md)) filter out weak packages but don't stop a popular one being hijacked. These layers do.

## Decision

- **No runtime dependencies.** `package.json` has no `dependencies`. The app uses Bun to build and Web APIs to run. A runtime package needs a new ADR that supersedes this one.
- **Few dev dependencies,** each with a reason in `dependency-allowlist.json` ([0006](0006-dependency-health-check.md)).
- **Exact versions.** No `^` or `~` in `package.json`; `bunfig.toml` sets `exact = true`.
- **Lockfile.** `bun.lock` is committed, in sync with `package.json`, and every install in CI uses `--frozen-lockfile`.
- **No install scripts.** `trustedDependencies` in `package.json` stays empty. Bun does not run dependencies' lifecycle scripts unless they are listed there.
- **Minimum release age.** `bunfig.toml` sets a 7-day minimum release age, so a version published in the last week cannot be installed.
- **Audit.** CI runs `bun audit` and fails on high or critical advisories.
- **Secrets.** gitleaks runs in the pre-commit hook and, pinned by checksum, in CI over the whole history.
- **CI hardening.** Every GitHub Action is pinned to a commit SHA. The Bun version in CI matches `packageManager` in `package.json`. Workflows default to no permissions, and each job declares the minimum it needs. Checkouts don't keep credentials.
- **Review.** CODEOWNERS requires a code owner to approve any change to `package.json`, `bun.lock`, `bunfig.toml` or `.github/`.

## Alternatives

- **Rely on Dependabot / Renovate alerts only:** reacts after a compromise is known, not before.
- **A UI framework:** a large tree of runtime code for a few screens, and a budget we couldn't keep ([0013](0013-static-browser-only.md)).
- **Vendor all dependencies:** too heavy for a repo this size.

## Consequences

- Security fixes arrive at least 7 days late unless a code owner overrides the release age for a specific upgrade (recorded in the PR).
- Adding a package is deliberately slow.
- Reading PDF invoices without a library is real work. When we get there, the choice (hand-written parser, or an approved package) gets its own ADR.
