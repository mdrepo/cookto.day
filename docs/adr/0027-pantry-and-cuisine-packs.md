# 0027. Keep amounts and condition in the pantry, and let a household load cuisine packs

- **Status:** Proposed
- **Date:** 2026-10-13
- **Deciders:** Mayur

## Context

[0015](0015-kitchen-packs.md) put each kitchen's food culture in data packs, and said the first pack is the founder's household (`packs/in-home`). Building toward the pantry and "what to cook today" showed two gaps:

- **A pack is a cuisine, not a household.** North Indian brings palak paneer and dal makhani; South Indian brings sambar and poriyal; European brings pasta. Many homes cook more than one. A household-shaped pack mixes what a cuisine is with one family's choices ("we don't make roti"), so no second family can reuse it.
- **The pantry needs amounts and condition.** Bills will be scanned automatically and they carry amounts ("Spinach 250 g", "Basmati rice 5 kg"). And a date isn't the whole story: spinach can wilt early, and bananas go overripe on the counter. The person in the kitchen knows; the app should let them say so, and cook those first.

## Decision

**Packs are cuisines a household loads.**
- A pack is one cuisine: `packs/north-indian`, later `packs/south-indian`, `packs/european`, `packs/sri-lankan`. Its contents stay as 0015 says: dishes (with parts, ingredients and amounts per serving, slot tags), staples, words per language, and rule sets with sources.
- A household loads one or more packs. Their dishes come in together, and so do their staples (once each).
- A household's own choices are settings, not a pack: parts it doesn't make ("roti"), ingredients it avoids, and food rules for a person. They filter what loaded packs offer.
- The first pack is `north-indian`, reviewed by someone who cooks it at home (0015's two reviewers). The founder's household is its first user, with "no roti" as a setting.

**The pantry keeps an amount and a condition for each item.**
- An item is an ingredient (a pack's Wikidata id, or words typed by the person when no loaded pack knows it), an **amount with a unit** (grams, millilitres or pieces; shown as kg or litres when large), and when it was bought.
- **Staples and fresh food.** Each ingredient says which it is. A staple (rice, dal, spices, oil) has no use-by date: it's there until it runs low or out. Fresh food has a use-by date, from its shelf life (USDA FoodKeeper, keyed by the same ids, 0015) and where it's kept.
- An amount may be unknown ("have it"): the staples checklist adds staples that way, and a bill fills the amount in later.
- **Condition:** fresh food is *good*, *use soon* or *past its best*. It starts from the use-by date; the person can mark it worse (the spinach is wilting) or better, and their mark wins until the next bill. Each pack's words can name it per ingredient ("wilting", "overripe"); otherwise the three general words show.

**What to cook today is the engine's.** For each slot someone eats today, it ranks the loaded packs' dishes that suit the slot and pass the household's filters:
1. dishes that can be made from the pantry (staples assumed) come first;
2. among them, dishes that use food *past its best*, then *use soon*, then the nearest use-by date;
3. the rest follow, each saying what it needs.

No cuisine logic in the engine: only ingredients, amounts, dates, conditions, slots and filters (0015).

**No made-up food data.** Agents draft packs; people check them, and checks make guessing fail:
- every dish has a `source`: a published recipe (a link), or "cooked at home by" its reviewer. `packs:check` fails on a dish without one;
- every ingredient's Wikidata id is checked against Wikidata's own label (a script refreshes a stored copy, so the check runs offline);
- every shelf life cites its USDA FoodKeeper entry, and `packs:check` fails on one without, or one that doesn't match the stored FoodKeeper data;
- a new pack, or a new dish, is reviewed by someone who cooks that food (0015).

**No filler in the app's words.** A words check (part of `bun run check`) fails on the app's English words when they hold AI-tell words ("delve", "seamless", "elevate", "unlock", "journey", "effortless", "Oops") or emoji. The list lives in one file, so a project built on this one can add its own.

**A sample kitchen, for trying it.** `?sample`, or "Try a sample kitchen" on an empty home, loads a sample pantry into the real repositories, marked as sample. "Clear the sample" removes it in one tap. Screens never contain made-up data.

## Alternatives

- **One pack per household (0015's `in-home`):** quickest for one family, but nobody else can reuse it, and a family that also cooks South Indian needs a new pack.
- **Have / low / out instead of amounts:** simpler to type, but scanned bills give amounts for free, and planning a week needs them ("enough paneer for two dishes?").
- **Only dates, no condition:** wrong whenever food goes off early or lasts longer. The person's eyes beat the table.
- **Trusting a model's food knowledge:** quick, and confidently wrong (invented dishes, made-up ids, guessed shelf lives). Sources and checks cost a little more once and stop it every time.
- **Mock data inside the screens:** quicker to show, but the fake paths stay in the code and the tests test them. Sample data through the real repositories is gone with one tap and leaves nothing behind.

## Consequences

- A household's pack choice is a list, and its own choices are settings that follow it to another phone (0025).
- Packs need amounts per serving for every ingredient, and `packs:check` checks them.
- Bill scanning can fill amounts directly. How a bill line becomes a pantry item is decided with bills.
- Cooking a dish will take its amounts out of the pantry; that waits for the week plan.
- Revisit if condition needs more than three levels, or if amounts need conversions a unit can't hold (a "bunch" of coriander).

## Implementation notes

This changes three lines of [0015](0015-kitchen-packs.md): packs are cuisines (not households), a household loads several, and the first pack is `north-indian`. Everything else in 0015 stands.
