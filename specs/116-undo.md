# #116: Undo: used up, and we cooked this

- **Issue:** #116
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

"Used up" and "We cooked this" are one tap, which is the point, and one wrong tap loses something: the onions vanish with their amount and date, or tomorrow skips a dish nobody cooked. A one-tap change needs a one-tap way back.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. undo used up

- **Given** onions, 1 kg, bought yesterday
- **When** they mark them "Used up"
- **Then** the Fridge says "Onion used up", with "Undo", and screen readers hear it
- **When** they press "Undo"
- **Then** the onions are back: 1 kg, bought yesterday

### 2. the note goes when they move on

- **Given** "Onion used up" showing
- **When** they open another food, or another page
- **Then** the note is gone, and the onions stay used up
- **And** it doesn't go by itself after a few seconds: people need time to read it

### 3. undo we cooked this

- **Given** lunch's Palak paneer marked "Cooked today"
- **Then** "Undo" sits beside "Cooked today", all day
- **When** they press it
- **Then** "We cooked this" is back, and tomorrow can pick Palak paneer again

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- {food} used up · Undo

## Out of scope

- Undo for every other change (amounts, conditions, the list): those are easy to change back by hand.
- A history of changes.
