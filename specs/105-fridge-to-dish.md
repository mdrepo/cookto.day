# #105: From the fridge to a dish: what can I make with this?

- **Issue:** #105
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

"The spinach is wilting: what do I do with it?" is the question the fridge raises every week. Today answers it for two meals; the person should be able to ask it of any food.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. from a food's sheet

- **Given** spinach in the fridge
- **When** they open spinach and press "Dishes with Spinach"
- **Then** Dishes opens titled "With Spinach", listing only dishes that use spinach (Palak paneer, Aloo palak), ready ones first
- **And** "All dishes" shows every dish again

### 2. from Today's "Use soon"

- **Given** spinach marked "Past its best"
- **When** they press spinach in Today's "Use soon"
- **Then** its sheet opens there, with "Dishes with Spinach"

### 3. food no dish uses

- **Given** "Dragon fruit" in the fridge, which no loaded dish uses
- **When** they open it
- **Then** its sheet has no "Dishes with" button

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Dishes with {item} · With {item} · All dishes

## Out of scope

- Searching dishes by name.
- Choosing several foods at once.
