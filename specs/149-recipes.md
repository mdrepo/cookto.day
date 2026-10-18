# #149: Recipes in our own words, for your household

- **Issue:** #149
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Changes:** specs/95-dish-page.md said "we don't copy recipe steps". We still don't copy them: we write our own.

## Why

The code-quality review found recipe amounts nobody had checked: three dishes were read from a page summary, egg curry had one egg a person, bhel puri had 10 g of puffed rice and 15 g of garlic. All 30 dishes link out to two websites for their steps; if those change, the app has none. The owner asked Claude to own the recipes: review each one, set amounts per person, and write short steps.

## Decisions

- **Claude reviews every dish** against two or three full recipes, not summaries, and records them in the dish's `sources`. Where they disagree a lot, it picks one and says why in the dish's `note`. Those notes are listed for the owner in the PR.
- **Amounts are per person,** and the dish page already scales them ("For 3 people", specs/95). Salt and spices scale too, rounded to what a cook measures: ¼ tsp, ½ tsp, 1 tsp.
- **Owner's known amounts:** egg curry is 2 eggs a person.
- **Short steps in our own words:** six to eight steps, one action each, in simple language. Never copied or paraphrased line by line from a source. The outside link stays, as "See a full version".
- **Prep sits above the steps** (#144).
- **A "check" note never ships.** `packs:check` fails on a dish note that says "check", "looks low", or "summary".
- **Shelf lives and photos are part of the same review:**
  - tomato in the fridge, about 7 days; coriander 4 days; fresh peas 3 days
  - a "Frozen" place beside "Fridge", with frozen peas at 90 days
  - dum aloo, mix veg and kadai paneer get photos of the right dish

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), plus `packs:check` tests.

### 1. steps on the dish page

- **When** they open dal tadka
- **Then** they see "Steps", numbered, under the ingredients, and "See a full version" at the end

### 2. amounts for the household

- **Given** three people at lunch
- **When** they open egg curry
- **Then** it says "For 3 people" and "Eggs: 6"

### 3. no unchecked notes

- **Given** a dish whose note says "One egg a serving looks low: check"
- **Then** `packs:check` fails and names the dish

### 4. frozen food

- **When** they add frozen peas
- **Then** they can choose "Frozen", and it says "use within 3 months"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Steps · See a full version · Frozen · use within {n} months · Each dish's steps (English first; the other languages after a native speaker's review)

## Out of scope

- Cooking timers and a step-by-step cooking mode.
- Videos.
- Nutrition.
