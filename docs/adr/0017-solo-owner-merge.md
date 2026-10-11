# 0017. CI can't be skipped; while there's one owner, a PR needs no approval; agents merge only when told

- **Status:** Accepted
- **Date:** 2026-10-11
- **Deciders:** Mayur
- **Supersedes:** [0014](0014-deploy-on-merge.md)

## Context

[0014](0014-deploy-on-merge.md) requires CI and one code owner's approval on every PR. Today there is one contributor, and GitHub doesn't let you approve your own PR. So every merge went through the admin override, and that override skipped everything, CI included. The rule on paper was stricter than the rule in practice, and the practice was too loose.

The review step guards against someone else's change. With one owner it only blocks them. CI guards against everyone, the owner included, and must never be skippable.

We first tried a ruleset that let an admin bypass the review on a PR. The API confirmed the owner could bypass it, but neither the GitHub mobile app nor the website offered the option on this personal repo, so the owner still couldn't merge.

Agents in this repo often act with the owner's GitHub token. If the owner can merge without a review, so can an agent holding that token. That has to be closed separately.

## Decision

Everything in [0014](0014-deploy-on-merge.md) stands (squash-merge only, Conventional Commit PR titles, every merge to `main` deploys after check, e2e and build pass, nothing else deploys, Wrangler pinned and run only in the deploy workflow, `wrangler.jsonc` and the deploy workflow code-owned), except how `main` is protected:

- `main` is protected by two repository rulesets, not classic branch protection.
- **"main: checks, no bypass":** the required checks (`check`, `rules`) must pass on an up-to-date branch; no force-pushes; no deletion. **Nobody can bypass it,** admins included.
- **"main: PRs only, no approval needed while there is one owner":** every change to `main` arrives through a PR, squash only, with **no approval required**. Nobody bypasses it.
- **Agents merge only when the owner tells them to,** for the PRs the owner names. Merging is the owner's approval of the change; an agent can't give it on its own. `AGENTS.md` says so, and `.claude/settings.json` makes Claude Code ask before every `gh pr merge`.
- **When a second person gets write access,** the PR ruleset goes back to one code owner's approval, in the same change that adds them.

## Alternatives

- **Keep classic protection with the admin override:** what we had; it skips CI too.
- **Let an admin bypass the review:** the cleanest on paper; GitHub didn't show the bypass on this personal repo, in the app or on the website.
- **A second GitHub account to approve:** a bot or alt account approving the owner's PRs is theatre, not a review.

## Consequences

- The owner merges from the normal button, phone included, and still can't merge a red PR or push straight to `main`.
- An agent with the owner's token could still call the API directly. The ask rule covers Claude Code; other tools rely on `AGENTS.md`. Revisit with a fine-grained token that can't merge if that proves weak.
- Revisit when the repo has a second regular contributor.
