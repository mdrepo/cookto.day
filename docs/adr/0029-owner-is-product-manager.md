# 0029. The owner is the product manager; agents build and merge inside gates that check judgment, not only form

- **Status:** Proposed
- **Date:** 2026-10-18
- **Deciders:** Mayur
- **Changes:** [0017](0017-solo-owner-merge.md)'s "agents merge only when told"

## Context

This repo is a boilerplate for safeguarding against AI contributions. Since 13 Oct the owner has delegated development, merging and deploying to agents, and kept product decisions and the rules. That was deliberate: the owner reviewed code by hand before the guardrails existed, and wants to be the product manager now that they do.

[0017](0017-solo-owner-merge.md) says agents merge only when told, for the PRs the owner names. In practice the owner said "merge them yourself" in chat, and agents merged 95 PRs in five days. Every one passed CI.

A code-quality review on 17 Oct found what the gates miss. Every rule a script checks was met. Most rules only a reader could check were not:

- **Logic in the wrong layer.** Domain rules lived in `apps/web/src/food.ts`, which no layer rule covers. "What a dish still needs" was written four times; dates four ways.
- **Tests that prove less than they say.** Nine kit tests passed with their part gutted; three engine and use-case tests passed with the code deleted.
- **Data nobody checked.** Recipe notes saying "check this" shipped. No soak times. A real receipt in public test data.
- **Rules only in prose.** AGENTS.md banned `@ts-expect-error`; ESLint allowed it. ADR 0024's error kinds were never built.

The gates check **form**: file size, commit order, tokens, a test that goes red then green. They don't check whether the test is real, the logic is in the right place, or the data is true. An agent that wants to pass will meet the form.

## Decision

**Roles.**
- **The owner is the product manager and owns the rules.** They decide what to build, and every change to what "correct" means.
- **Agents build, test, merge and deploy,** inside the gates below.

**What waits for the owner's merge** (their approval):
- product specs, and changes to them
- ADRs
- any change to an existing test, check, lint rule, CI workflow, `CODEOWNERS`, `.claude/settings.json` or the review checklist
- new or changed dependencies
- pack data that changes what people cook or eat: amounts, shelf lives, steps, prep (agents propose; the owner merges)
- anything public, about money, or about privacy

**What agents merge themselves,** once every required check is green: code under an approved spec, fixes that meet an approved spec, refactors, the look, and docs that follow decisions already made. Each PR lists "Decided without you", every test it changed, and every time it amended an unpushed `test:` commit.

**Every rule says how it's enforced.** AGENTS.md gets an "Enforced by" column: a lint rule, a CI check, or "the owner reads it". A rule in the third column is a known gap the owner chose, not one found later. Prose rules move to the first two columns where they can: tonight's first batch bans `Date` outside the clock and the engine, `@ts-expect-error`, and static-markup tests.

**A cold reviewer checks judgment.** A second model, not the author, with no memory of the work, reads each code PR's diff, its spec and the ADRs, and answers a fixed checklist: which lines meet each criterion; what change would turn each new test red; whether any rule lives outside its layer; whether an existing function already does this; whether the PR changes more than its spec asks.
- **First on the owner's laptop,** advisory: `claude -p` with the checklist, posting a PR comment.
- **Then a required check,** a GitHub Action that runs from `main` (`workflow_run`), with the owner's Max subscription token as a repository secret and a token that can't push. The PR can't change the reviewer that reviews it.
- After two failed rounds, the PR stops and waits for the owner.

**Tests are measured, not counted.** Mutation testing on the engine and the use cases, with a score that fails `check`. "Red then green" says a test fails once; mutation testing says whether it catches a bug.

**Specs say where each rule lives.** The spec template gets a line naming the package and function. The owner reads that line when approving.

## Alternatives

- **The owner reviews every diff again:** safe, and the reason the guardrails were built was to stop doing it.
- **Agents merge nothing:** [0017](0017-solo-owner-merge.md) as written. In practice it was overridden in chat within two days; a rule people route around is worse than an honest one.
- **Trust the author with a longer checklist:** the author wants to pass and wrote the test to match its code. A cold reader doesn't.

## Consequences

- The owner's time goes to specs, data and the held PRs, not diffs. A morning's held PRs each say in one line what to approve.
- Guardrail files change rarely, and only through the owner. An agent that edits a check to pass it is caught by `CODEOWNERS` and the ask list.
- The reviewer costs the owner's subscription quota. If it's too much, it reviews only code PRs, or drops to a cheaper model with the same cold read.
- Any check can be gamed by what it checks. The owner picks the checks; agents have no say in editing them.
- Revisit when a second person gets write access ([0017](0017-solo-owner-merge.md) already says what changes then), or if the reviewer's false alarms outnumber its finds.
