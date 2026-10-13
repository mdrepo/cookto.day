# #72: The kitchen: load what you cook, keep a pantry, see what to cook today

- **Issue:** #72
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decisions:** [ADR 0027](../docs/adr/0027-pantry-and-cuisine-packs.md), proposed in the same PR.

## Why

After onboarding, the kitchen is empty and there's nothing to cook. The household should load the cuisines they cook, fill a pantry in a minute (staples ticked for them, fresh food typed in), say when something is going off, and see what to cook today, food that needs using first at the top. Bills fill the pantry later; a sample kitchen lets anyone try it now.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), unless it says otherwise.

### 1. choose what you cook

- **Given** a household that finished onboarding, with an empty kitchen
- **When** they press "Choose what you cook"
- **Then** they see the cuisines: North Indian, with how many dishes it has, and South Indian, European and Sri Lankan as "Coming soon"
- **And** loading North Indian brings its dishes in, and the cuisine shows as loaded

### 2. the usual staples, ticked for you

- **Given** North Indian loaded
- **When** they open "Add the usual staples"
- **Then** the cuisine's staples are listed, grouped (grains and dals, spices, basics), all ticked
- **When** they untick two and press "Add 23 staples"
- **Then** the pantry lists those staples under Staples, each saying "Have it", and not the two they unticked

### 3. add fresh food, with its amount

- **When** they add "Spinach", 250 g, bought today
- **Then** the pantry lists it under Fresh as "Spinach · 250 g · use within 3 days"
- **And** typing a name no loaded cuisine knows still adds it, as typed, with no use-by date

### 4. say how it is

- **Given** spinach that's still good, and onions
- **When** they mark the spinach "Past its best"
- **Then** it moves to the top of Fresh, marked "Past its best" (screen readers hear it), and stays marked after a reload

### 5. change an amount, or use it up

- **When** they change the paneer from 200 g to 100 g
- **Then** it shows 100 g
- **When** they mark the onions "Used up"
- **Then** the onions leave the pantry

### 6. what to cook today

- **Given** an adult eating lunch and dinner, North Indian loaded, staples in, and spinach and paneer in the pantry
- **When** they open home
- **Then** they see "Cook today": for lunch and for dinner, palak paneer near the top, saying it uses the spinach
- **And** a dish missing something says what it needs: "Needs: chickpeas"

### 7. food that needs using comes first

- **Given** spinach marked "Past its best", and potatoes that are good
- **Then** a dish that uses spinach comes before one that uses only potatoes

### 8. what the household doesn't make

- **Given** North Indian loaded
- **When** they turn off "Roti" under "What we don't make"
- **Then** no suggestion offers roti; dishes that come with roti or rice show rice

### 9. a sample kitchen to try

- **Given** a household with an empty kitchen
- **When** they press "Try a sample kitchen" (or open the app with `?sample`)
- **Then** North Indian is loaded and the pantry is filled, marked "Sample kitchen", and Cook today has suggestions
- **When** they press "Clear the sample"
- **Then** the pantry and the cuisine are as they were before

### 10. a cuisine's dishes

- **Given** North Indian loaded
- **When** they open its dishes
- **Then** each dish shows its name, which meals it suits, and whether the pantry has what it needs

### 11. changing one item redraws only its row (a render-count test, ADR 0023)

- **Given** a pantry with spinach and onions
- **When** the spinach's amount changes
- **Then** the spinach's row re-renders, and the onions' row doesn't

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Choose what you cook · North Indian · South Indian · European · Sri Lankan · {n} dishes · Loaded · Load · Coming soon
- Add the usual staples · Grains and dals · Spices · Basics · Add {n} staples · Have it
- Pantry · Fresh · Staples · Add food · Name · Amount · g · kg · ml · l · pieces · Bought · Today · Use within {n} days · Use today
- Good · Use soon · Past its best · Used up · Change amount
- Cook today · Breakfast · Morning snack · Lunch · Evening snack · Dinner · Uses {items} · Needs: {items}
- What we don't make · Roti
- Try a sample kitchen · Sample kitchen · Clear the sample
- Dishes · Has everything · Needs {n} things

The North Indian pack's dish and ingredient names are its own words (ADR 0015), reviewed with the pack.

## Out of scope

- Bills: uploading, scanning, forwarding, and how a bill line becomes a pantry item. Next, with ADR 0025's server.
- Taking a cooked dish's amounts out of the pantry, and the week plan.
- South Indian, European and Sri Lankan dishes: each needs a pack and someone who cooks that food to review it (ADR 0015).
- Food rules for a person (toddler food, no spicy food): their rule sets need sources; next after this.
- Sync between phones (ADR 0025).

## How it lands

Each with its own tests, red first. After this spec, every PR below merges once CI passes, except the pack's data (step 2), which needs its cook's review (ADR 0015).

1. **Engine:** pantry items (amount, unit, use-by, condition), and ranking dishes for a slot.
2. **The North Indian pack** (`packs/north-indian`, about 30 dishes incl. snacks, staples, words, shelf lives) and `packs:check`. Reviewed by you, as its cook.
3. **Data and use cases:** the pantry and pack repositories, loading a pack, the staples checklist, household settings (what we don't make), the sample kitchen.
4. **Screens:** choose what you cook, staples, pantry, add food, cook today on home, dishes. Kit parts as needed.
