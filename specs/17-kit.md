# #17: Every part of the design is on one page, and today's page is built from those parts

- **Issue:** #17
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Screens are about to arrive (onboarding, the bill upload, the pantry). If each one styles its own select and empty state, they drift apart and agents keep reinventing them. One page that shows every part, in every theme, language and state, is where a code owner checks a part once, and where an agent looks before building.

## Acceptance criteria

Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. the kit shows every part in light and dark, English and Arabic

- **Given** someone opens cookto.day/kit/
- **When** the page loads
- **Then** they see each part (field, select, empty state, note) under its name, four times side by side: light English, dark English, light Arabic, dark Arabic
- **And** the dark ones have dark backgrounds, and the Arabic ones read right to left

### 2. the kit shows every state of a part

- **Given** someone on the kit page
- **When** they look at the select
- **Then** they see it as normal, disabled, and with a problem ("Choose a language"), the problem in the warning colour under the control
- **And** a screen reader reads the problem along with the select's label

### 3. today's page is the same after the rebuild

- **Given** a visitor on cookto.day
- **When** the page loads, in English and in Arabic
- **Then** the title, language list, empty state and note are where they were, the same size and colour as before

## Words

None for the app. The kit page is for people building cookto.day, in English, with app text as its examples.

## Out of scope

- `Button`, `Card` and icons: the next issues (#18 is icons).
- Layouts (`Stack`, `Screen`): step 4 of ADR 0019. The kit page lays itself out with its own CSS.
- Screenshot tests of the kit: they need Docker for stable fonts, so they get their own ADR.
- A link to the kit from the app. It's public, so anyone looking at the boilerplate can see it, but people cooking never need it.
