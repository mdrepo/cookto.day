# #195: Who cooks: the planner's evening, the cook's day, and the plan counts as made

- **Issue:** #195
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** the role is a setting, `packages/data`: `settings.role`, per phone, not synced; "not made" is on the planned meal, `packages/data`: `PlannedMeal.made`; the use cases, `packages/usecases`: `chooseRole()`, `sortTomorrow()`, `swapTomorrow()`, `madeIt()` (today's `cookedIt`), `didntMake()`; what a planned meal keeps out of the next days, `packages/engine`: `plannedLately()`, beside `cookedLately()`; the screens, `apps/web/src/features/home/` (Today, for each role), `features/onboarding/` (a third step) and `features/settings/` (the role).

## Why

In this household both parents work and a helper cooks. Nobody holds the phone at the stove. The daily load isn't cooking: it's deciding what she makes, telling her, and remembering what was made, every day, from scratch.

The owner's words (18 Oct): "we have to tell her what to make; tracking it is difficult and a big cognitive load." And: "mark it made" was hard to use, not because of buttons, but because it asked the wrong person, after the fact.

## Decisions

- **Two roles, per phone.** "I plan the meals" or "I cook the meals". Chosen once at setup ("Who cooks?") and in Settings. Each phone has one role; a household can have both, once phones share data (sign-in, #157). Until then, one phone switches.
- **You decide tomorrow, you never report yesterday.** From 4 pm the planner's Today starts with "Tomorrow": each meal's pick, with other ideas to swap in, "Looks good" and "Share tomorrow". Pressing "Looks good", or 9 pm passing, makes it "Tomorrow's sorted". **Silence is yes:** a plan nobody touched still stands.
- **The plan counts as made.** A meal planned for a day that has passed is treated like a cooked one: it isn't picked again for `KEEP_DIFFERENT_DAYS`. Nobody has to mark anything. The fridge never changes by itself.
- **"Didn't make it"** is the quiet correction, on the dish's page, for a planned meal of the last two days. It frees the dish to be picked again.
- **The cook's Today is the day's work:** each meal's dish, opening its steps; "Made" on each, one tap at the stove; "Use soon"; "Add what you bought". No other ideas, no tomorrow, nothing to approve.
- **"Share tomorrow"** is the bridge until messages exist (Telegram, a later spec): the plan as plain text, through the phone's share sheet, or copied. Same shape every day.
- **No streaks, no reminders, no "did you cook?"** A gift, not a task.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), plus unit tests for `plannedLately()` and the use cases.

### 1. who cooks, at setup

- **Given** "Who eats at home?", step 2 of 3
- **When** they press Next
- **Then** they see "Who cooks?", step 3 of 3, with "I cook" chosen, and "Someone else cooks"
- **When** they choose "Someone else cooks" and press Next
- **Then** "All set" follows, and this phone plans the meals

### 2. the planner's evening

- **Given** someone else cooks, North Indian loaded, and it's 7 pm
- **When** they open Today
- **Then** "Tomorrow" is the first thing: lunch's and dinner's picks, each with "Other ideas", then "Looks good" and "Share tomorrow"
- **When** they pick another idea for dinner
- **Then** dinner's pick is that dish
- **When** they press "Looks good"
- **Then** it says "Tomorrow's sorted", with the picks and "Change"

### 3. silence is yes

- **Given** the same, and nobody pressed anything
- **When** they open Today at 9:30 pm
- **Then** it says "Tomorrow's sorted", with the picks
- **When** they open Today at 8 the next morning
- **Then** lunch's and dinner's dishes are those picks

### 4. share tomorrow

- **Given** tomorrow's picks, chickpeas to soak for lunch, and curd missing for dinner
- **When** they press "Share tomorrow"
- **Then** the text shared or copied reads, line by line: "Tomorrow", "Lunch: Chole", "Dinner: …", "Tonight: soak the chickpeas", "Buy: curd"
- **And** a toddler's dish is its own line: "For the child: Khichdi with veggies"

### 5. the cook's day

- **Given** "I cook", North Indian loaded, lunch and dinner planned last night
- **When** they open Today
- **Then** they see "Today": lunch's and dinner's dishes, each opening its page, each with "Made"; no "Other ideas", no "Tomorrow"
- **When** they press "Made" on lunch
- **Then** lunch says "Made", and the button is gone
- **And** "Use soon" and "Add what you bought" are still there

### 6. the plan counts as made

- **Given** two dishes in My dishes, A and B, and A planned for yesterday's dinner, with nothing marked
- **When** they open Today
- **Then** dinner's pick is B, and A isn't lunch's or dinner's pick

### 7. didn't make it

- **Given** the same
- **When** they open A's page
- **Then** it says "Planned for dinner yesterday" and has "Didn't make it"
- **When** they press "Didn't make it"
- **Then** A is among today's ideas again

### 8. the role, in Settings

- **Given** "I cook"
- **When** they open Settings and choose "I plan the meals"
- **Then** Today shows the planner's page: at 7 pm, "Tomorrow" first

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Who cooks? · I cook · Someone else cooks · Who cooks (Settings) · I plan the meals · I cook the meals
- Tomorrow (exists) · Looks good · Tomorrow's sorted · Change · Share tomorrow · Tonight: {prep} · Buy: {items} · For the child: {dish} (exists)
- Today · Made · Didn't make it · Planned for {meal} {day} (today, yesterday)

## Out of scope

- The cook's own phone, and the plan reaching it by itself: needs sign-in (#157), then messages (Telegram, a later spec).
- Her day off, and what the child doesn't eat yet: later onboarding steps.
- A week view, streaks, reminders, notifications.
- Amounts for one toddler on the steps (#149).
