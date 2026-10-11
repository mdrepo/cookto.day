# 0015. Keep the engine generic and put each kitchen's food culture in data packs

- **Status:** Proposed
- **Date:** 2026-10-11
- **Deciders:** Mayur

## Context

cookto.day starts with one household in India and Dubai, but the problem is the same everywhere: food goes off, nobody has a plan, and whoever cooks needs to know what to make. What changes from home to home is the food culture, not the problem:

- **What a meal is.** One dish with roti; rice with sambar, poriyal and rasam; one soup and three sides.
- **Which meals get planned.** Dinner; also breakfast when idli batter has to be ground the night before; a child's lunch box every day.
- **What every kitchen already has.** Atta and masalas in one, rice, tamarind and coconut oil in another, miso and dashi in a third.
- **Rules.** Vegetarian, Jain, halal, fasting days, toddler food. These differ by family and by country.
- **Words.** "Palak", "keerai" and "spinach" are the same ingredient.
- **Where food comes from and where the plan goes.** Different shops and bills; WhatsApp or LINE; YouTube or another recipe site.

A prototype ran a North Indian kitchen and a South Indian one through the same screens. The screens held up only after three changes: a day has meal slots, a dish is made of parts, and a dish can need work the day before. If this culture lives in code, every new kitchen is a code change and the app stays one family's app.

## Decision

- **The engine knows nothing about any cuisine.** It works with households, people and their rules, ingredients, freshness, meal slots, dishes made of parts, prep lead times, and the week plan. No dish name, ingredient name or cultural rule appears in `src/` outside a pack.
- **A kitchen pack is data,** in `packs/<id>/`, one folder per pack. It holds:
  - `pack.json`: name, languages, the meal slots it plans, and its share channel and recipe search.
  - `dishes.json`: each dish's parts, ingredients, prep lead time (for example "ferment 8 hours") and tags (light, quick, packs well).
  - `staples.json`: what a kitchen is assumed to have until the household says otherwise.
  - `words/<lang>.json`: the household's words for every ingredient and dish, per language.
  - `rules.json`: rule sets (diets, fasting days, toddler guidance), **each with a cited source**.
- **Ingredients are identified by Wikidata id** (`Q…`), never by name, so packs can share ingredients and the freshness data (USDA FoodKeeper, keyed by the same ids).
- **`bun run packs:check` validates every pack** and is part of `bun run check`. It fails on:
  - a pack that doesn't match the schema;
  - an ingredient without a Wikidata id;
  - a dish or ingredient with no word in one of the pack's languages;
  - a rule without a source;
  - a dish that uses an ingredient the pack doesn't define.

  Like every other check, its failure messages say what to fix.
- **Packs are added and changed by PR,** like code. Each pack folder has its own owners in `CODEOWNERS`, and a new pack needs **two reviewers: a code owner, and someone who cooks that food at home.**
- **Shop bill parsers live in their own folder** (`parsers/<shop>/`), with test bills that have personal details removed. A pack lists the shops its households use.
- **The first pack is the founder's own household** (`packs/in-home`), and the app works end to end with that one pack before a second is accepted.

## Alternatives

- **One cuisine in the code, others later.** Faster for the first household, but every later kitchen means rewriting screens built around roti and tadka.
- **Packs loaded from a server or a marketplace.** Anyone could publish one without review, and it breaks [0013](0013-static-browser-only.md) (no network). Packs ship inside the app instead.
- **AI-generated dishes and rules for any cuisine.** Easy coverage, but nothing is checkable. A wrong toddler rule or a mistranslated dish gets past review. Packs are written and reviewed by people who cook that food.

## Consequences

- A contributor can add a Sri Lankan, Kenyan or Japanese kitchen without touching the engine. That makes "good first pack" issues possible.
- Each pack adds weight to the app. Packs are loaded only when a household picks them, and the page-size budget still applies to every page.
- `packs:check` is a new check to maintain, and the schema becomes a contract: changing it needs an ADR.
- Revisit if packs need runtime behaviour, such as code to parse a meal structure, that data can't express.
