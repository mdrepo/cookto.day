# #65: Onboarding: where you live, and who eats which meals

- **Issue:** #65
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Design:** the clickable prototype agreed on 13 Oct 2026, https://claude.ai/artifact/NsiKudXVxSAEFVkLd6aQPN

## Why

The people here are a household opening cookto.day for the first time. Before the app can plan anything, it needs to know where they shop and who eats which meals ([ADR 0026](../docs/adr/0026-meals-belong-to-people.md)). It should take under a minute, with good defaults, and never be asked twice.

We start with Singapore, in English. India, the UAE, Hindi, Marathi and Arabic are shown as coming soon.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), unless it says otherwise.

### 1. a first visit starts with where you live

- **Given** someone who has never used cookto.day
- **When** they open it
- **Then** they see "Where do you live?", step 1 of 2, with Singapore chosen, its currency (S$) and its shops
- **And** India and the United Arab Emirates are shown as "Coming soon", and can't be chosen

### 2. English to start, other languages coming soon

- **Given** the language list
- **Then** English is chosen, and Hindi, Marathi and Arabic are listed as coming soon, and can't be chosen
- **And** someone who chose another language before keeps English for now
- **And** a reviewer can still see the page in a language that's coming soon, by opening it with `?preview-language=hi` (or `mr`, `ar`), so translations and right to left can be checked before they're turned on. The existing tests of those languages use it.

### 3. everyone who eats at home, with their meals

- **Given** "Who eats at home?", step 2 of 2
- **Then** it starts with one adult, eating lunch and dinner
- **When** they add a child
- **Then** the child eats breakfast, morning snack, lunch, evening snack and dinner
- **And** a toddler is marked "toddler food"
- **And** tapping a meal ticks or unticks it, and screen readers hear whether it's ticked
- **And** a name is optional; without one, people are "Adult", "Child 2" and so on
- **And** removing everyone shows "Add at least one person." and Next can't be used

### 4. all set, before going on

- **Given** an adult eating lunch and dinner, and a child eating all five
- **When** they press Next
- **Then** they see "All set" and "We'll plan 5 meals a day for 2 people."
- **And** each meal with who it's for: breakfast for the child, lunch for everyone; a meal nobody eats says "Not planned"
- **And** Back returns to who eats, as they left it

### 5. home shows the household

- **When** they press "Go to my kitchen"
- **Then** they see the home page with "2 people · 5 meals a day" and Edit, above the empty kitchen
- **And** Edit opens who eats, as they saved it

### 6. skip for now

- **Given** who eats
- **When** they press "Skip for now"
- **Then** they go home with one adult eating lunch and dinner

### 7. asked once

- **Given** a household that finished or skipped onboarding
- **When** they open cookto.day again, or reload
- **Then** they go straight home, with their household as they left it

### 8. the browser's back button

- **Given** any step
- **When** they press the browser's back button
- **Then** they go to the step before, as they left it

### 9. ticking a meal redraws only that person (a render-count test, ADR 0023)

- **Given** two people on who eats
- **When** one person's meal is ticked
- **Then** that person's card re-renders, and the other's doesn't

### 10. the main button is easy to read, in light and dark

- **Then** the main button's words are white on aubergine in both themes, and `design:check` passes its contrast (a token change: in dark, the button is a deeper aubergine, `#8a4f78`)

## Words

English only; Hindi, Marathi and Arabic follow with a native speaker (ADR 0012).

- Where do you live? · We use your currency, and read the bills your shops send. · Coming soon · Singapore · India · United Arab Emirates
- Step 1 of 2 · Step 2 of 2
- Who eats at home? · Tick the meals each person eats at home. We plan those. · Adult · Child · Toddler · toddler food · Name (optional) · Meals · Remove {name} · Add at least one person.
- Breakfast · Morning snack · Lunch · Evening snack · Dinner
- Next · Back · Skip for now · Go to my kitchen
- All set · We'll plan {n} meals a day for {n} people. · Everyone · Not planned · You can change this any time.
- {n} people · {n} meals a day · Edit
- In the language list: coming soon

## Out of scope

- Choosing a kitchen, and food rules: they come with the kitchen packs.
- India and the UAE, Hindi, Marathi and Arabic: turned on later, each with its shops or a native speaker's review.
- Sync and login (ADR 0025).

## How it lands

Each with its own tests, red first:

1. **Kit parts** (`bun run new component`, designed by the prototype): `Chip` (a toggle, `aria-pressed`), `Input`, `Choice` (a radio card that can be "coming soon"), `Tag` (a small label), `Steps` (step x of n), the `ActionBar` layout, and the main button's dark token.
2. **Languages and country:** coming-soon languages, `?preview-language=`, and the household's country in the settings (Singapore).
3. **Reading saved data:** TanStack Query and the bridge that refreshes it when a repository announces a change (ADR 0024), household use cases (`packages/usecases/src/household.ts`), and onboarding's done-ness.
4. **Onboarding itself:** `bun run new screen onboarding`, its steps in the URL (`#/start/where`, `#/start/who`, `#/start/done`), and home's household line.
