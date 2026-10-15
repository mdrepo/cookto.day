# #113: Quick add: tap the fresh food you bought

- **Issue:** #113
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

After the staples, Today says "Needs: Onion, Tomato, Green chilli". Fresh food is what changes every few days, and most of it comes from the market with no bill. Typing each one, with its amount and unit, is slow. Tapping what you bought takes seconds.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. tap what you bought

- **Given** North Indian loaded, and an empty fridge
- **When** they press "Add food" on the Fridge
- **Then** they see "Tap what you bought": the cuisine's fresh food as buttons, A to Z, and none of its staples
- **When** they tap Spinach, Tomato and Coriander and press "Add 3"
- **Then** Fresh lists all three, each with its use-by, bought today

### 2. bought another day

- **Given** Spinach tapped
- **When** they choose "Bought: Yesterday" and press "Add 1"
- **Then** spinach says it was bought yesterday: one day less to use it

### 3. tap and type together

- **Given** Tomato tapped
- **When** they also type "Mango" in Name
- **Then** the button says "Add 2", and pressing it adds both
- **And** with nothing tapped, typing works as before (specs/72, criterion 3)

### 4. bought, so off the list

- **Given** Tomato on the shopping list
- **When** they add tomato by tapping it
- **Then** the shopping list no longer has tomato

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Tap what you bought · Add {n}

## Out of scope

- An amount for each tapped food: change it later in its sheet.
- Food no loaded cuisine knows: type it.
- Putting what you buy most often first.
