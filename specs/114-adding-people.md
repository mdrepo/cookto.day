# #114: Adding people is quick: one card open, add buttons in reach

- **Issue:** #114
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

On a phone, each person's card is most of the screen: a name box and five meal buttons. With two or three people, "+ Adult", "+ Child" and "+ Toddler" sit below the cards, under the bottom bar. After typing a name, the keyboard covers them too. Adding a family means scrolling, closing the keyboard, and finding the button again.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. one card open at a time

- **Given** "Who eats at home?" with one adult
- **When** they press "+ Adult"
- **Then** Adult 2's card is open, with its name and meals
- **And** Adult 1 folds to one line: "Adult 1 · Lunch, Dinner"
- **When** they press Adult 1's line
- **Then** Adult 1 opens again, and Adult 2 folds

### 2. the add buttons stay in reach

- **Given** an adult, a child and a toddler
- **Then** "+ Adult", "+ Child" and "+ Toddler" are on the screen without scrolling, above the bottom bar, on a phone

### 3. done typing closes the keyboard

- **When** they type a name and press the keyboard's Done (Enter)
- **Then** the name box lets go (the phone's keyboard closes), and the name is kept

## Words

None new: the folded line uses the person's name and their meals.

## Out of scope

- Changing the meal buttons themselves.
- Reordering people.
