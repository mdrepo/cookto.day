# #94: Lunch and dinner suggest different dishes

- **Issue:** #94
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Today often picks the same dish for lunch and dinner ("Moong dal khichdi" twice). Nobody cooks the same thing twice in a day, so the second pick looks broken and wastes the space.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. each meal gets its own dish

- **Given** an adult eating lunch and dinner, North Indian loaded with its staples, and nothing fresh in the fridge
- **When** they open Today
- **Then** lunch's pick and dinner's pick are different dishes
- **And** lunch's pick can still be one of dinner's "Other ideas", after the others

### 2. food that needs using still comes first

- **Given** spinach marked "Past its best", and onions that are good
- **When** they open Today
- **Then** lunch's pick uses the spinach
- **And** dinner's pick is a different dish, and uses the spinach too if another dish does

## Words

None.

## Out of scope

- Remembering what was cooked yesterday, or over the week (the week plan).
- Breakfast and snacks: the same rule applies to every meal someone eats, but no new words or settings.
