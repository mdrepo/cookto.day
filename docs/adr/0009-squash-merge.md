# 0009. Squash-merge; merging never deploys

- **Status:** Superseded by 0014
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

The TDD workflow ([0002](0002-tdd-workflow.md)) produces several commits per change (`test:`, `feat:`, `refactor:`). We want a readable `main` history. And an agent that can merge must not also be able to ship to users by doing so.

## Decision

- PRs are merged with **squash-merge only**. Merge commits and rebase-merge are disabled in the repository settings.
- The **PR title** must follow Conventional Commits, because it becomes the commit message on `main`. CI checks the title.
- Branch commits still follow Conventional Commits (the `commit-msg` hook, and CI), because the TDD rules read the `test:` commits.
- `main` is protected: CI and one code owner's approval are required, approvals are dismissed by new commits, and force-pushes are blocked.
- **Merging never deploys.** Deploys (to a static host) are started by hand from `main`. No workflow may deploy on `push` or on merge.

## Alternatives

- **Merge commits:** keeps the red/green history on `main` but makes it noisy.
- **Rebase-merge:** every branch commit must be well-formed and every one lands on `main`.
- **Deploy on merge:** convenient, but a merged mistake reaches users before anyone has looked at it running.

## Consequences

- One commit per PR on `main`, which makes reverts simple.
- The red → green evidence lives in the PR, not in `main`'s history.
- Someone has to remember to deploy. That's the point: a person decides when users get a change.
