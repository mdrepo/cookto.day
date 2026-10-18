# #147: A Maharashtrian pack and an Our kitchen pack

- **Issue:** #147
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Poha and bhel puri sit in the North Indian pack, but they're Maharashtrian. And families eat across cuisines: the owner's family has sandwiches, chole in pita, palak soup and pumpkin soup. Packs are for managing dishes; they shouldn't force a dish into the wrong cuisine.

## Decisions

- **Cuisine packs keep traditional dishes.** A new **Maharashtrian** pack takes poha and bhel puri from North Indian, and adds more Maharashtrian dishes in the recipe review (#149).
- **An "Our kitchen" pack** holds what a family eats that crosses cuisines: Bombay sandwich, paneer sandwich, potato beetroot sandwich, palak soup, pumpkin soup. It also holds the child's dishes (#145).
- **Chole in pita isn't a new dish.** Chole's "Serve with" adds bhature and pita to rice and roti. Same cooking, a different plate.
- **A household that loaded North Indian keeps poha and bhel:** on its next visit the app loads Maharashtrian for it too, once, so nothing disappears.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. the new packs

- **When** they open "Choose what you cook"
- **Then** they see North Indian, Maharashtrian and Our kitchen
- **And** North Indian no longer lists poha or bhel puri

### 2. nothing lost

- **Given** a household that loaded North Indian before this change, and cooked poha last week
- **When** they open the app
- **Then** Maharashtrian is loaded too, and poha is still in Dishes, with last week's "Cooked" remembered

### 3. serve with pita

- **When** they open chole
- **Then** "Serve with" lists rice, roti, bhature and pita

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Maharashtrian · Our kitchen · Bhature · Pita · Each dish's name

## Out of scope

- Packs a family writes itself.
- Choosing a different plate per meal: "Serve with" lists them, as today.
