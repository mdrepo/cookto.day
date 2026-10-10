# 0008. Git hooks without dependencies, Conventional Commits

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

We want fast local feedback before code reaches a PR: formatting, lint, types, tests, secrets and commit messages. The usual tools for this (husky, lint-staged, lefthook, commitlint) add packages, and commitlint pulls in a large tree, which conflicts with [0005](0005-supply-chain-policy.md).

## Decision

- Hooks are plain POSIX shell scripts in `.githooks/`, enabled with `git config core.hooksPath .githooks`. `bun install` sets this up through the `prepare` script.
- **pre-commit:** Prettier on staged files; ESLint on staged TypeScript and the typecheck; gitleaks if installed. When the only TypeScript staged is tests (the red step of [0002](0002-tdd-workflow.md)), ESLint and the typecheck are skipped, because red tests may import code that doesn't exist yet.
- **commit-msg:** Conventional Commits: `type(optional-scope): summary`, where type is one of `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`, `build`, `perf`, `revert`. The rule is one function in `scripts/commit-rules.ts`, shared with CI.
- **pre-push:** unit and DOM tests, `tdd:verify` ([0002](0002-tdd-workflow.md)) and e2e ([0004](0004-e2e-runs-locally.md)).
- Hooks are a convenience. CI repeats every check except e2e, because hooks can be skipped with `--no-verify`.

## Alternatives

- **husky + lint-staged:** two packages for what a few lines of shell do.
- **lefthook:** fast, but one more package and binary.
- **commitlint:** a large dependency tree for a single regex.

## Consequences

- No hook dependencies to audit.
- Hook scripts must stay POSIX-compatible to work on macOS, Linux and Git for Windows.
