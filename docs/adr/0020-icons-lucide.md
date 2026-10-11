# 0020. Draw icons from Lucide, through one Icon component

- **Status:** Accepted
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

[DESIGN.md](../../DESIGN.md) says emoji and plain text are the icons. That was fine for one page with no icons. The next screens (the bill upload, the pantry, the week plan) need small, clear signs: upload, camera, delete, back, a warning. Emoji look different on every phone, some are missing on older Android, they can't take the theme's colours, and an arrow emoji doesn't turn round for Arabic. Drawing our own set is slow and uneven. `lucide-react` ships to users, so it needs its own ADR ([0018](0018-ui-react.md)).

## Decision

- **Icons come from Lucide** (`lucide-react`, ISC licence): over 1,500 line icons on one 24px grid with one stroke width, so any two match. It's a runtime dependency, pinned exactly, through the allowlist and health checks ([0006](0006-dependency-health-check.md)), the 7-day release age and everything else in [0005](0005-supply-chain-policy.md) as kept by 0018.
- **One `Icon` component** in `packages/ui` is the only file that imports `lucide-react`. It takes a name from an approved list, not any of them: `<Icon name="upload" />`. Adding a name is a one-line change a code owner reviews, like a token.
- **Sizes are tokens:** `icon.sm` 16px, `icon.md` 20px, `icon.lg` 24px. Stroke and shape stay Lucide's.
- **Colour is the text's** (`currentColor`), so icons follow light, dark, muted and warning text with no colour of their own.
- **Meaning, or none.** An icon that carries meaning on its own (a delete button with no words) needs a `label`, which screen readers read. Without one it's decoration and hidden from them (`aria-hidden`). An icon never replaces words where there's room for words.
- **Direction.** Names that point (`arrow-*`, `chevron-*`, `undo`) are marked in the list and flip in right-to-left pages.
- **Only what's used ships.** Named imports from a package marked side-effect free, so Bun's bundler drops every icon we don't use. Icons count against our 20 KB of JavaScript ([0018](0018-ui-react.md)).
- **`design:check` fails** on a `lucide-react` import outside `Icon`, and on a raw `<svg>` in `apps/*/src`.
- **Upgrades are rare.** Lucide releases most days, mostly new icons. We move only when we need an icon we don't have, or for a security fix.

The brand marks (logo, app icon) are not icons and stay our own SVG files.

## Alternatives

- **Emoji, as now:** free and no dependency, but not the same on every phone, not themeable, and no direction.
- **Copy Lucide's SVGs into the repo:** no dependency, but our own script to fetch, check and update them, and no help from Dependabot or the health check when Lucide fixes a drawing. Revisit if the dependency ever fails a health check.
- **Material Symbols:** a font or large SVGs, filled shapes that don't sit with a notebook look, and its own licence notice.
- **Heroicons:** good, but about 300 icons; kitchen ones (a cooking pot, a fridge, a carrot) are missing. Lucide has them.
- **An icon font:** a whole font to download for a few icons, and fonts from outside are against DESIGN.md.

## Consequences

- Every screen gets the same kind of icon, sized and coloured by tokens, read correctly by screen readers, and turned round in Arabic.
- One more package ships to users. It's small per icon, but it has one npm maintainer, so the health check needs a written exception; we rely on the pinned version, the release age and review of each upgrade.
- DESIGN.md's "emoji and plain text are the icons" changes when `Icon` lands (#18), not before.
