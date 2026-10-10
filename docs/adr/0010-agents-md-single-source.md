# 0010. AGENTS.md as the single source of agent guidance

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Contributors use different agents (Claude Code, Codex, Cursor, Antigravity), and each reads its own files. Separate copies of the rules drift apart.

## Decision

- **`AGENTS.md`** at the repo root is the single source of agent guidance: what this is, a map, commands, the workflow, the rules (each with what enforces it) and when to stop and ask. It stays short and links to ADRs for reasons and to `docs/` for detail.
- Tool-specific files are **thin pointers** with no rules of their own. Claude Code: `CLAUDE.md` contains only `@AGENTS.md`.
- **Skills** live in `.agents/skills/<name>/SKILL.md` (read by Codex and Antigravity). Claude Code reads `.claude/skills/`, where each skill is a symlink to the same folder.
- **Claude Code asks before editing** every path in `.github/CODEOWNERS` (`permissions.ask` in `.claude/settings.json`), and bypass and auto modes are disabled, so an agent can't edit a test, a spec, a check or an ADR without the person seeing it.
- `bun run agents:check` keeps all of this in step: skills have a name and description, every skill has its symlink, `CLAUDE.md` is only the pointer, the ask list matches CODEOWNERS exactly, `AGENTS.md` lists the commit types the hooks accept, and relative links point at files that exist.
- `docs/workflow.md` is the long human version, with a worked example.
- Guidance tells agents what to do; the gates in [0002](0002-tdd-workflow.md), [0007](0007-lint-format-tooling.md) and [0008](0008-git-hooks-without-dependencies.md) enforce it.

## Alternatives

- **Separate full rule files per tool:** they drift apart.
- **Only human docs (`CONTRIBUTING.md`):** agents don't reliably read them.
- **Claude Code hooks that block edits:** stronger, but only for one tool; the ask list plus CODEOWNERS covers every tool at review time.

## Consequences

- One file to update when a rule changes, and a check that fails when the copies disagree.
- On Windows, the symlinks need Developer Mode and `core.symlinks true` (see `docs/workflow.md`).
