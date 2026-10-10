# 0001. Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Most code in this repo is written by AI agents, driven by people who may not be able to judge a technical choice. It's also public, so others clone it as a starting point. Decisions made in conversation are lost, and an agent that doesn't know why a rule exists will "fix" it: add a popular dependency we rejected, weaken a test, or reintroduce a pattern we removed.

## Decision

- Record significant decisions as ADRs in `docs/adr/`, using `template.md`.
- A decision is significant if it constrains future code, tooling, dependencies, testing, design or workflow, or if someone is likely to ask "why don't we just…?".
- Accepted ADRs are binding on humans and agents.
- To change a decision, add a new ADR that supersedes the old one; a code owner must approve it. Never rewrite the Decision section of an accepted ADR. The PR rules in CI fail a PR that does.
- `AGENTS.md` states the rules briefly and links to the ADR for the reason.

## Alternatives

- **Decisions only in `AGENTS.md` / `CONTRIBUTING.md`:** rules without reasons get argued with or silently dropped, and agent instruction files should stay short.
- **Decisions in an issue tracker or wiki:** agents can't read them, and they drift from the code.

## Consequences

- One extra file per significant decision.
- Reviewers can reject a PR by pointing to an ADR instead of re-arguing.
- The Alternatives sections stop settled questions from being reopened.
