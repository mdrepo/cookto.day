# #58: The household in the engine: people, their meals, and which slots get planned

- **Issue:** #58
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

The people here are the household, and whoever builds cookto.day. Onboarding will ask who eats and which meals, and the plan will cover those meals ([ADR 0026](../docs/adr/0026-meals-belong-to-people.md)). The rules belong in the engine, as pure functions, so onboarding, the plan and a phone app all follow the same ones, and they're tested without a browser.

## Acceptance criteria

Each criterion becomes one unit test in `packages/engine/test/` (ADR 0002, 0003).

### 1. a new person's meals start from who they are

- **Given** a new person
- **When** they're an adult
- **Then** they eat lunch and dinner
- **And** a child, or a toddler, eats breakfast, morning snack, lunch, evening snack and dinner

### 2. the plan covers every slot someone eats, in the day's order

- **Given** an adult who eats lunch and dinner, and a child who eats all five
- **Then** the planned slots are breakfast, morning snack, lunch, evening snack, dinner
- **And** with only the adult, they're lunch and dinner
- **And** with nobody, there are none

### 3. each slot is planned for the people who eat it

- **Given** the same adult and child
- **Then** lunch is for both, and the morning snack is for the child only

### 4. a person's meals are the five slots, each once

- **Given** a person read back from storage, or from another phone
- **When** their meals include a slot that isn't one of the five, or the same slot twice, or their type isn't adult, child or toddler
- **Then** the engine says what's wrong with them, so the app can drop the bad part instead of planning from it

## Words

None yet: the slots' and types' words come with onboarding's screen, in every language.

## Out of scope

- Food rules and their exceptions per person, which need the packs' rule sets.
- The household's country, and shops (ADR 0026): they come with onboarding.
- Storing any of it: step 2b, the data foundation.
