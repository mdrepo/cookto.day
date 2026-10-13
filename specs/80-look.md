# #80: Today and the pantry look like the prototype

- **Issue:** #80
- **Approval:** the owner approved the direction in chat (13 Oct 2026): the prototype's look, in aubergine. Look changes merge once CI passes; the owner sees screenshots afterwards.
- **Design:** the Claude Design prototype ("cookto.day prototype": the app's Today and Fridge screens), in DESIGN.md's colours, type and spacing.

## Why

The kitchen (#72) works, but every screen is a stack of cards with dropdowns and buttons. The prototype shows what people need at the fridge: one clear pick per meal and why, food to use soon at a glance, a short list you tap to change, and a way between pages with one thumb.

## Acceptance criteria

Each criterion is an e2e test on an Android phone, an iPhone and a desktop (ADR 0021), unless it says otherwise. The kit's new parts are checked on the kit page, in light, dark and Arabic.

### 1. one pick per meal, and why

- **Given** a household eating lunch and dinner, North Indian loaded, spinach and paneer in the pantry
- **Then** Today shows a card for Lunch and one for Dinner, each with its best dish in large words ("Palak paneer"), what it's served with, and why: "Uses Spinach and Paneer" beside a warm dot, and "Needs: …" or "Has everything"
- **When** they press "Other ideas" on Lunch
- **Then** the next four dishes for lunch show, each with what it uses or needs

### 2. food to use soon, at the top of Today

- **Given** spinach marked "Past its best" and onions that are good
- **Then** Today shows "Use soon" with Spinach and its warning tag, and not the onions

### 3. a bar at the bottom

- **Then** Today, the pantry and the dishes show a bar at the bottom with Today, Pantry and Dishes; the page you're on is marked as current
- **When** they press Pantry
- **Then** the pantry shows, with Pantry marked as current

### 4. the pantry as a short list

- **Then** the pantry lists "Use soon", "Fresh" and "Staples", each item one row: its name, "250 g · use within 3 days" under it, and its warning tag at the end; "Add food" sits at the top

### 5. tap a row to change it

- **When** they tap Spinach
- **Then** a sheet opens for Spinach: how it is, change amount, used up
- **When** they mark it "Past its best", or close the sheet (Close, or Escape)
- **Then** the sheet closes, the row shows the change, and focus is back on the row

### 6. #72's criteria still hold

- Every criterion of `specs/72-kitchen.md` still passes; its tests change only where the markup moved (its page object, and asking for "Other ideas" to see more than one dish).

## Out of scope

- "Cooking this" (taking a cooked dish out of the pantry) and the week plan: they need the week plan's spec.
- The toddler's portion lines: they need the toddler food rules, with sources.
- The mascot image, and the prototype's green.
