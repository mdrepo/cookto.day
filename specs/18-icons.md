# #18: Icons look the same on every phone, are read out when they mean something, and turn round in Arabic

- **Issue:** #18
- **Decision:** [ADR 0020](../docs/adr/0020-icons-lucide.md): Lucide, through one `Icon` component.
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The next screens (the bill upload, the pantry, the week plan) need small, clear signs. Emoji look different on every phone, can't take the theme's colours, and don't turn round for Arabic. A screen reader user must hear what an icon means, or not hear it at all when it's only decoration.

## Acceptance criteria

`Icon` isn't on today's page yet, so these are shown on the kit page (cookto.day/kit/). Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. an icon that means something is read out

- **Given** the kit's "With a label" example: a delete icon labelled "Remove"
- **When** a screen reader reaches it
- **Then** it reads "Remove", in English, and "إزالة" in Arabic

### 2. a decorative icon is skipped by screen readers

- **Given** the kit's "Beside words" example: a carrot icon next to the word "Carrots"
- **When** a screen reader reaches it
- **Then** it reads only "Carrots"

### 3. arrows turn round in Arabic, other icons don't

- **Given** the kit's "Back" arrow and the carrot
- **When** they're shown in Arabic
- **Then** the arrow points the other way from the English one (to the right, the way back in Arabic), and the carrot is the same as in English

### 4. icons take the colour of their text, in light and dark

- **Given** an icon in normal text, and one in muted text
- **When** they're shown in light and in dark
- **Then** each icon is drawn in the colour of the text around it

### 5. three sizes, from the tokens

- **Given** the kit's "Sizes" example
- **When** it's shown
- **Then** there are icons 16, 20 and 24 pixels square, and no other size can be asked for

## Words

None for the app. The kit's examples use "Remove" (إزالة) and "Carrots" (جزر), and "Back" (رجوع).

## The first approved names

Lucide has over 1,500 icons; `Icon` allows only these, until a code owner adds more. Merging this spec approves them:

`arrow-left` (back; turns round), `chevron-down`, `chevron-right` (turns round), `plus`, `minus`, `x` (close), `check`, `trash-2` (remove), `search`, `upload`, `camera`, `file-text` (a bill), `refrigerator`, `cooking-pot`, `carrot`, `calendar`, `shopping-cart`, `triangle-alert` (warning).

## Out of scope

- Icons on today's page: it has none, and gets them when a screen needs one.
- Buttons with icons: `Button` is its own issue.
- The logo and app icon: our own SVGs, not icons (ADR 0020).
- Lucide's version: pinned when it's added, at least 7 days old, with a written exception for its one npm maintainer (ADR 0006, 0020).
