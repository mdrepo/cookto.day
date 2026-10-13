# 0026. Meal slots belong to people, and shops to where the household lives

- **Status:** Proposed
- **Date:** 2026-10-13
- **Deciders:** Mayur

## Context

[0015](0015-kitchen-packs.md) put a kitchen's food culture in data packs, and two things with it that turned out not to be cultural:

- **Which meals get planned.** 0015 has each pack list its meal slots. But within one household, people eat at different times: a child has three meals and two snacks, an adult may have lunch and dinner. Two households with the same food differ more here than two cuisines do.
- **Where food comes from.** 0015 has each pack list its shops. But an Indian kitchen in Singapore shops at RedMart and Sheng Siong, not Blinkit. Shops follow where the household lives, not what it cooks.

## Decision

**Five meal slots, the same everywhere:** breakfast, morning snack, lunch, evening snack, dinner, in that order through the day. The engine owns them; their words live with the app's other words ([0012](0012-localisation.md)).

**Each person ticks the slots they eat.** A household is its people: each is an adult, a child or a toddler, with an optional nickname and their ticked slots. A new person starts ticked by who they are:
- an adult: lunch and dinner;
- a child or a toddler: all five. A toddler's food also follows toddler rules.

**The plan covers every slot at least one person eats,** and each slot is planned for the people who eat it. A slot nobody ticks isn't planned. Snacks are planned like meals, so packs carry snack dishes.

**Packs say which slots a dish suits** (a tag per dish: breakfast, snack, main), instead of listing the slots they plan.

**Food rules:** the household's rules, with exceptions per person (no spicy food for the child). Packs still supply the rule sets, with their sources.

**Shops follow where the household lives.** The household chooses a country (India, the UAE, Singapore to start), which picks its currency and the shops whose bills it can read. Shop parsers are grouped by country (`parsers/<country>/<shop>/`), not listed by packs.

Everything else in 0015 stands: the engine knows no cuisine, packs are data, ingredients are Wikidata ids, and packs are checked and reviewed as 0015 says.

## Alternatives

- **Slots from the pack** (0015): one set for the whole household, which can't plan a child's snacks without planning them for everyone.
- **Slots per household:** closer, but still one set for people who eat at different times.
- **Any number of named slots:** flexible, but every screen and plan then handles open-ended slots for little gain. Five cover the households we know; revisit if one doesn't fit.
- **Shops from the pack:** wrong as soon as a family moves.

## Consequences

- Onboarding asks who eats and which meals, with good defaults, so most people just confirm.
- The plan can serve a child's snack and the family's dinner from one pantry.
- Packs get simpler (no slot list, no shop list) but need snack dishes.
- 0015's slot and shop lines no longer apply; its status stays Accepted, with a note pointing here.
