# 0011. A design guide, enforced by a check with a ratchet

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

Agents asked for "a badge" or "a warning" invent one: a new colour, an odd size, a corner radius nobody chose. Each looks fine alone; together the app stops looking like one thing. Agents also write `margin-left`, which breaks the Arabic layout ([0012](0012-localisation.md)). A written guide alone doesn't stop this.

## Decision

- **`DESIGN.md`** is the rule for how every screen looks: principles, tokens (colour, type, corners, spacing), the components to reuse, and what to do when the design isn't settled. It is code-owned. Agents don't decide the look: the guide or a code owner does.
- Tokens are CSS variables in `src/styles.css`, with a light and a dark value. Raw values appear only in the `:root` blocks that define them.
- **`bun run design:check`** (part of `bun run check`) scans `src/` and fails on: colour values outside the tokens; font sizes, radii and font families that aren't a token; font weights other than 400, 600 and 700; spacing that isn't a step of 4px; physical `left`/`right` properties; and fonts, imports or files from other sites.
- **The ratchet.** If the guide tightens and existing files don't meet it, each file's count of off-guide values is recorded in `scripts/check-design.ts`. A count may go down, never up; the entry goes at 0. The map started empty.
- UI PRs attach screenshots in light and dark, in English and Arabic.

## Alternatives

- **A UI kit or CSS framework:** a dependency ([0005](0005-supply-chain-policy.md)), and still no check that agents use it.
- **Stylelint:** one more dependency tree for a handful of regex rules.
- **Review only:** reviewers miss a `#333` in a diff; a script doesn't.

## Consequences

- New looks go through a code owner, by design.
- The check reads CSS as text, so it can be fooled by unusual syntax; review catches the rest.
