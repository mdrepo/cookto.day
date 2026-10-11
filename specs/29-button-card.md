# #29: Buttons say what they do and when they're busy, and cards hold one thing each

- **Issue:** #29
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Every screen coming next has actions (add a bill, save the pantry, remove an item) and things to show one at a time (a dish, a pantry item). If each screen styles its own, the main action stops looking like the main action, a slow save gets pressed twice, and Arabic and dark mode break one screen at a time.

## Acceptance criteria

Shown on the kit page (cookto.day/kit/), since today's page has no buttons or cards yet. Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. the main action is aubergine, in light and dark

- **Given** the kit's main button, "Add a bill"
- **When** it's shown in light and in dark
- **Then** it's filled with the action colour (aubergine), its words are in the colour made to sit on it, and it's at least 44px tall

### 2. quiet and danger buttons look less important, and different

- **Given** the kit's quiet button ("Cancel") and danger button ("Remove")
- **When** they're shown beside the main one
- **Then** the quiet one has an outline and aubergine words on the surface colour, and the danger one has an outline and words in the warning colour (ember), so neither looks like the main action

### 3. a busy button says so, and can't be pressed twice

- **Given** the kit's "Saving" example: a main button that's busy
- **When** someone presses it, or a screen reader reaches it
- **Then** nothing happens, a small turning circle shows next to its words (still, for people who turn motion off), and the screen reader hears it's busy

### 4. a disabled button can't be pressed, and looks it

- **Given** the kit's disabled button
- **When** someone presses it or tabs to it
- **Then** nothing happens, Tab goes past it, and it's drawn in the muted colours

### 5. a button can have an icon, or be only an icon

- **Given** the kit's "Add a bill" with a plus icon, and an icon-only "Remove" button
- **When** they're shown, in English and in Arabic
- **Then** the icon sits before the words (on the right in Arabic), in the words' colour, and the icon-only button is a 44px square that a screen reader reads as "Remove" (إزالة)

### 6. a card holds one thing, named by its title

- **Given** the kit's card for "Palak paneer"
- **When** it's shown in light and dark, and a screen reader reaches it
- **Then** it sits on the surface colour with a border and rounded corners, and the screen reader reads it as "Palak paneer"

## Words

None for the app. The kit's examples use "Add a bill" (أضف فاتورة), "Cancel" (إلغاء), "Remove" (إزالة), "Saving" (جارٍ الحفظ), "Save" (حفظ), and a dish, "Palak paneer" (بالاك بانير).

## New icon

`loader-circle`, for the turning circle. Merging this spec adds it to the approved icons (specs/18-icons.md). It's the first motion in the design: it stops for people who turn motion off (the foundation already does this), and DESIGN.md says so.

## Out of scope

- Buttons and cards on today's page: they arrive with the screens that need them (onboarding first).
- A link that looks like a button: a later issue, when a screen needs one.
- Cards you can tap as a whole: the first card holds things; a tappable card is its own design.
