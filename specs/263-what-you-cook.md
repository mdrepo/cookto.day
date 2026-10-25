# #263: Setup asks what you cook, so a new kitchen isn't empty

- **Issue:** #263
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `packages/usecases`: `chooseCuisine()` in `kitchen.ts`, beside `loadCuisine()`; `apps/web`: `features/onboarding/` (a new step, `CuisinesStep`, with its hook) and `routes.ts` (`#/start/cuisines`); the words in `apps/web/src/i18n/`. No new component: the step uses the kit's parts the other steps use.

## Why

Setup ends with an empty kitchen. Today's biggest card is then "Choose what you cook" or "Try a sample kitchen", a setup job on the screen meant for the day's food, and someone who tried the sample ends up planning from pretend food. Asking once, inside setup, means a household starts with its own dishes, on the website and inside Telegram ([#260](260-start-in-telegram.md)) alike.

## Decisions

- **A new step, third of four: "What do you cook?"** After "Who eats at home?" and before "Who cooks?", which becomes step 4 of 4. "Where do you live?" is step 1 of 4, who eats step 2 of 4.
- **The cuisines as the Cuisines page has them.** Each cuisine with a pack is a tick with its dish count, in the page's order (North Indian, Maharashtrian, Our kitchen today); the rest are listed as "Coming soon" and can't be ticked. Nothing is ticked at first.
- **A tick loads it; unticking takes it off.** Ticking a cuisine loads it as "Load" does on the Cuisines page; unticking removes it from the household's cuisines. Nothing else changes: staples and fresh food come after, from Today, as now.
- **At least one to go on.** With nothing ticked, Next can't be used and the step says "Choose at least one." "Skip for now" ends setup here, as it does on who eats: home, with what was chosen so far and an empty kitchen.
- **Back keeps the ticks.** Back from who cooks shows the cuisines as they were left.
- **Inside Telegram, the same step.** The household started at the end of setup ([#260](260-start-in-telegram.md)) holds the cuisines ticked, in its settings record, so every phone in it has them.
- **Phones already set up aren't asked.** The step is part of setup only. The sample kitchen stays on Today's empty-kitchen card for someone who skipped.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. what do you cook

- **Given** someone setting up, on who eats
- **When** they press Next
- **Then** they see "What do you cook?", step 3 of 4, with North Indian, Maharashtrian and Our kitchen to tick, each with how many dishes it has, and South Indian, European and Sri Lankan as "Coming soon", which can't be ticked
- **And** nothing is ticked, "Choose at least one." shows, and Next can't be used

### 2. ticked cuisines are loaded

- **Given** "What do you cook?"
- **When** they tick North Indian and Maharashtrian, untick Maharashtrian, and press Next
- **Then** they see "Who cooks?", step 4 of 4
- **When** they press Next and "Go to my kitchen"
- **Then** Today doesn't say "Your kitchen is empty", and "Choose what you cook" shows North Indian loaded and Maharashtrian not loaded

### 3. back keeps the ticks

- **Given** North Indian ticked, and "Who cooks?"
- **When** they press Back
- **Then** they see "What do you cook?" with North Indian ticked, and Next can be used

### 4. skip for now

- **Given** "What do you cook?"
- **When** they press "Skip for now"
- **Then** they're home, with "1 person · 2 meals a day" and "Your kitchen is empty"

### 5. inside Telegram

- **Given** setup inside Telegram, for someone with no household ([#260](260-start-in-telegram.md))
- **When** they tick North Indian and finish setup
- **Then** the household was started with North Indian in its settings record's cuisines

## Words

New, in English, Hindi, Marathi and Arabic:

- "What do you cook?"
- "Tick what your family cooks. You can change it later."
- "Choose at least one."

The step counts ("Step 3 of 4") and the cuisine names, dish counts and "Coming soon" are words the app already has.

## Out of scope

- Staples and fresh food during setup: Today's next step card asks for them, as now.
- What the household doesn't make ("What we don't make" on the Cuisines page).
- Removing the sample kitchen: it stays for people who skip setup's question.
- The Today screen's layout: a later spec.
