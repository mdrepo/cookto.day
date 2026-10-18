# #175: My dishes, picked from packs; packs and Settings under More

- **Issue:** #175
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** My dishes is saved data, `packages/data`: a `myDishes` repository, synced like the pantry (ADR 0025); adding and taking away are use cases, `packages/usecases`: `addToMyDishes()`, `takeOutOfMyDishes()`; Today's plan reads only My dishes, `packages/engine`: `cookTodayForMeals()` gets My dishes as its `dishes`; the screens are `apps/web/src/features/more/` (new), `features/packs/` (today's cuisines screen, reworked) and `features/dishes/` (now My dishes).
- **Changes:** specs/72 (a household loads packs, and every loaded dish can be planned) and specs/147 criterion 2 (a moved dish's pack is loaded): from now on, a dish is planned when it's in My dishes, wherever it came from.

## Why

The owner's words: "I pick dishes from packs to add to my dishes, and the plan is from my dishes." A family cooks a few dozen dishes, not every dish in every pack. Packs are a library to pick from; My dishes is what this family cooks, and only those are planned.

## Decisions

- **Packs are a library.** Each pack lists its dishes, each with "Add" or "In My dishes".
- **My dishes is the household's own list,** across packs. The Dishes tab becomes **My dishes**. Today plans only from it.
- **Opening a pack the first time ticks all its dishes** into My dishes; the household unticks what it doesn't cook (the owner's choice, 18 Oct).
- **The child's dishes work the same way,** in their own group, "For the child", in My dishes (the owner's choice, 18 Oct).
- **A fourth tab, More,** holds "Packs" and "Settings". The gear on Today goes.
- **Nothing changes on the day it ships:** a household's My dishes starts as every dish of every pack it has loaded (poha and bhel puri included, from Maharashtrian).
- **Taking a dish out** keeps what was cooked, the fridge and the shopping list. Adding it back brings its history with it.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. More

- **When** they press "More" in the tab bar
- **Then** they see "Packs" and "Settings"
- **And** Today has no gear

### 2. a pack, the first time

- **Given** a new household
- **When** they open Packs, then Maharashtrian
- **Then** its 8 dishes are listed, each "In My dishes"
- **And** My dishes has those 8

### 3. taking a dish out, and back

- **Given** Maharashtrian's dishes in My dishes, and poha cooked today
- **When** they press "Take out" on poha in My dishes
- **Then** poha is in no list on Today or My dishes, and Maharashtrian shows poha with "Add"
- **When** they press "Add"
- **Then** poha is back in My dishes, still "Cooked today"

### 4. the plan comes from My dishes

- **Given** North Indian in My dishes, with every dish taken out but dal tadka and rajma
- **When** they open Today
- **Then** lunch's and dinner's picks are dal tadka and rajma, and their other ideas only those two

### 5. the child's dishes

- **Given** Our kitchen opened, and a toddler at home
- **Then** My dishes has a group "For the child", with khichdi with veggies and banana in it

### 6. nothing changes on the day it ships

- **Given** a household that loaded North Indian before this change
- **When** they open My dishes
- **Then** all of North Indian's dishes and Maharashtrian's poha and bhel puri are there

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- More · Packs · My dishes · In My dishes · Add · Take out · For the child · {n} dishes · Settings (exists)

## Out of scope

- Dishes a family writes itself (a "new dish" form).
- Sharing My dishes with another household.
- Moving the shopping list into More: it stays where it is.
