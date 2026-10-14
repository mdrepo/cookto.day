# #97: Dishes you can cook now come first

- **Issue:** #97
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Dishes lists every dish in A to Z order, so the ones you can cook right now hide among the ones you can't. The first thing the app should show is hope: "you can cook these now".

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. Dishes: ready first, then the closest

- **Given** North Indian's staples, and spinach and paneer in the fridge
- **When** they open Dishes
- **Then** "You can cook now" comes first, listing every dish that has everything, A to Z
- **And** "Need a few things" follows, fewest missing first, then A to Z

### 2. Today says how many you can cook

- **Given** the same kitchen
- **When** they open Today
- **Then** it says "You can cook 5 dishes now" (the real count), and pressing it opens Dishes
- **And** with nothing ready, it doesn't show

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- You can cook now · Need a few things · You can cook {n} dishes now / You can cook 1 dish now

## Out of scope

- Filters or search on Dishes.
- Counting amounts (enough paneer for two dishes?): "has it" is enough for now.
