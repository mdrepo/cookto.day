# #95: A dish's page: what you have, what you need, and the recipe

- **Issue:** #95
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The app suggests dishes but you can't open one. Someone deciding what to cook wants to see, in one place, what the dish takes, what's already in the kitchen, what to buy, how much for the whole family, and how to cook it.

We don't copy recipe steps: they belong to the people who wrote them. Each dish already cites its source (specs/72, criterion 12), so the page links to it.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. open a dish from Dishes

- **Given** North Indian loaded
- **When** they press "Palak paneer" in Dishes
- **Then** a page titled "Palak paneer" opens, saying it suits lunch and dinner
- **When** they press Back (or the browser's back button)
- **Then** they are back in Dishes

### 2. open a dish from Today

- **Given** suggestions on Today
- **When** they press lunch's dish, or a dish in its "Other ideas"
- **Then** that dish's page opens

### 3. what you have, and what you need

- **Given** North Indian's staples, and spinach and paneer in the fridge
- **When** they open Palak paneer
- **Then** "You need" lists what the kitchen doesn't have (e.g. cream), and "You have" lists the rest, spinach and paneer among them
- **And** a dish the kitchen has everything for says so, with no "You need"

### 4. amounts for everyone at home

- **Given** a household of two adults who both eat lunch
- **When** they open Palak paneer
- **Then** it says "For 2 people", and each ingredient shows its amount for two: spinach 130 g (65 g each)
- **And** small amounts stay readable: cumin shows 0.6 g, never "0 g"

### 5. what to serve it with

- **Given** a dish served with roti or rice, and a household that doesn't make roti
- **Then** the page says "Serve with rice"

### 6. the recipe, from its source

- **When** they open any dish
- **Then** a "See the recipe" link names the site it's on ("vegrecipesofindia.com") and opens it in a new tab
- **And** the page has no copied steps

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- You have · You need · For {n} people / For 1 person · See the recipe · on {site} · Serve with {items} (Cook today's words already)

## Out of scope

- Cooking steps in the app, timers, a cooking mode.
- Saying "I cooked this", and taking its amounts out of the fridge.
- Adding what you need to a shopping list.
- Nutrition, photos.
- Toddler portions: everyone counts as one serving until food rules for a person land.
