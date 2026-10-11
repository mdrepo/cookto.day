# #14: Every screen works with a keyboard, and reads well in every script

- **Issue:** #14
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Some people move through the page with a keyboard, or a switch, and need to see where they are. Hindi, Marathi and Arabic letters reach higher and lower than English ones, so lines spaced for English feel cramped. Both should be right on every screen without anyone remembering to do it.

## Acceptance criteria

Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. keyboard focus is easy to see

- **Given** a visitor using a keyboard
- **When** they press Tab until the language list has focus
- **Then** it has a clear outline in the action colour, at least 2px thick, apart from its edge

### 2. Hindi, Marathi and Arabic get taller lines

- **Given** a visitor on the English page
- **When** they choose हिन्दी, मराठी or العربية
- **Then** the lines of text are taller than in English (1.7 times the text size, not 1.5)

## Words

None.

## Out of scope

- Reduced motion and the 44px minimum for controls ship in the same stylesheet, but today's page has no animation and one control that is already 44px, so there is nothing new to see yet. Components test them as they arrive.
- Focus for a mouse or a tap: the outline is for keyboards only, as browsers do.
