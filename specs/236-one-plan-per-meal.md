# #236: One plan for each meal, whichever phone saved it

- **Issue:** #236
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `packages/data`: `plans.ts`, the plan's id made from its day, meal and who it's for, and the reader keeping one plan per meal; nothing else changes.

## Why

Found while grilling [ADR 0034](../docs/adr/0034-workflows-and-templates.md). A plan record gets a random id when a phone saves tomorrow's pick. Two phones in one household that open Tomorrow before they sync each save their own record for the same meal, and sync matches records by id, so the household ends up with two dinners for one day. The server will soon save plans too (ADR 0034). One id per meal fixes it for every writer.

## Decisions

- **A plan's id is made from what it is**: `plan:{day}:{meal}`, and `plan:{day}:{meal}:child` for the child's dish beside it ([spec #145](145-child-dish.md)). Two phones, or a phone and the server, saving the same meal write the same record, and sync keeps the newer version ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)).
- **Plans already saved keep their random ids.** When a day and meal has more than one plan, the reader shows the newest (by when it was last changed), and the next change to that meal is written to the new id and marks the others deleted, so a household cleans up as it goes. No migration of the phone's data.
- Nothing on screen changes.

## Acceptance criteria

Unit tests in `packages/data/test`, on the memory store and through the sync engine with the fake server ([spec #217](217-households.md)).

### 1. the same meal, the same record

- **Given** an empty store
- **When** tomorrow's dinner is planned
- **Then** its record's id is `plan:{tomorrow}:dinner`; the child's dish beside it is `plan:{tomorrow}:dinner:child`

### 2. two phones, one dinner

- **Given** two phones in a household, both offline
- **When** each plans tomorrow's dinner (different dishes), then both sync
- **Then** the server holds one plan for tomorrow's dinner, and both phones show the same dish: the one saved with the higher version, or on a tie the server's

### 3. plans saved before this change

- **Given** a phone holding two plans for one day's dinner with random ids, saved at different times
- **Then** the reader shows one dinner, the newer
- **When** that dinner is swapped
- **Then** the swap is saved at `plan:{day}:dinner`, and both old records are marked deleted

## Words

None.

## Out of scope

- The server picking tomorrow's plan: the workflows specs (ADR 0034).
- Other collections with the same risk (the shopping list, cooked meals): each when it bites.
