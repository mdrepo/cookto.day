# #240: Meal times, the household's time zone, and the cook's days off

- **Issue:** #240
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `packages/engine`: `household.ts` gains `MEAL_TIMES` (the defaults) and `cooksOn(day, settings)`; `packages/data`: `household-settings.ts`, the one synced record [spec #217](217-households.md) already decided (kitchen, country, beans, the day that's sorted), built here with three more fields: `timeZone`, `mealTimes`, `daysOff`; `packages/usecases`: `setMealTime()`, `setDaysOff()`, `addDayOff()`, `removeDayOff()`; `apps/web`: `features/settings/Household` (Meal times, and Days off on the cook's row); `apps/api`: `household/schedule.ts`, reading a household's schedule from its settings record for the workflows. No migration: the settings record is a record like any other.

## Why

The bot has to ask at the right moment: tomorrow's plan at 10 pm ([#241](241-tomorrow-in-telegram.md)), and each meal an hour after it's eaten ([#242](242-meal-checks.md)). The server doesn't know the household's clock or when it eats, and on the cook's day off it shouldn't send her anything.

## Decisions

- **This is #217's fifth PR, with three more fields.** Kitchen, country, beans and the day that's sorted move into the one household settings record as #217 decided. The three new fields go in the same record, and sync and resolve the same way.
- **The time zone comes from the phone that starts the household.** It's the phone's own (`Intl.DateTimeFormat().resolvedOptions().timeZone`), saved when the household starts. A household made before this ships takes it from the first planner phone that opens after the update. Settings shows it under Household as "Time zone: Asia/Kolkata" with no control yet: a family that moves can sign out and in again later, or a later spec adds a picker.
- **Each meal has a time, set per household.** Defaults: breakfast 8:00, morning snack 11:00, lunch 13:00, evening snack 17:00, dinner 20:00. Settings > Household > "Meal times" lists only the meals the household eats, each with a time picker, in steps of 15 minutes. A meal must be later than the one before it; a time that isn't says "Lunch must be after breakfast." and isn't saved.
- **The cook's days off are weekdays and dates.** On the cook's row in Household: "Days off" with the seven weekdays as chips (none by default), and "Add a date" for a single day off. Dates in the past drop off by themselves. The cook doesn't set them herself yet.
- **"No cooking tomorrow" is a day off too.** [#241](241-tomorrow-in-telegram.md)'s button adds tomorrow's date to the same list, so the app and the bot agree on one fact: the days the cook isn't cooking.
- **One planner.** A household has one member with role *plan* for now; the bot's questions go to them. Inviting a second planner is hidden until a later spec decides who gets asked.
- **The server reads the schedule, it never writes it.** `schedule(household)` returns the time zone, the meal times, the eaten slots and the days off, from the synced records. A household with no settings record yet gets the defaults and no time zone, and the bot sends it nothing.

## Acceptance criteria

Criteria 1 to 5 are e2e tests on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), offline, with the API faked in the browser as in [#217](217-households.md). Criterion 6 is a unit test in `apps/api/test`; criterion 7 in `packages/engine/test`.

### 1. the settings record syncs

- **Given** two phones in one household
- **When** the first changes the country, the beans and lunch's time, and marks tomorrow sorted
- **Then** after a pull the second phone shows all four

### 2. the time zone is the phone's

- **Given** a phone in Asia/Kolkata with no household
- **When** it signs in and starts one
- **Then** the record holds `Asia/Kolkata`, and Settings shows "Time zone: Asia/Kolkata"

### 3. meal times

- **Given** a household of two adults, who eat lunch and dinner
- **When** the planner opens Meal times
- **Then** it shows Lunch 13:00 and Dinner 20:00, and no other meals
- **When** they set dinner to 12:30
- **Then** "Dinner must be after lunch." shows and dinner stays 20:00
- **When** they set dinner to 21:00
- **Then** it's saved and syncs

### 4. days off

- **Given** a household with a cook on Telegram
- **When** the planner picks Sunday and adds 25 October
- **Then** the cook's row says "Off Sundays and 25 Oct", and both sync
- **When** 25 October has passed
- **Then** the row says "Off Sundays"

### 5. one planner

- **Given** a household with its planner
- **When** they press "Invite"
- **Then** "Who?" offers only "The cook"

### 6. the server's schedule

- **Given** a household whose settings say Asia/Kolkata, dinner 21:00, Sundays off, and which eats lunch and dinner
- **When** the API reads its schedule
- **Then** it gets that time zone, lunch 13:00, dinner 21:00, the two slots, and the days off
- **Given** a household with no settings record
- **Then** its schedule has no time zone, and no run is ever due for it

### 7. is the cook cooking that day

- **When** `cooksOn()` is asked about a Sunday, 25 October, and a Monday, with Sundays and 25 October off
- **Then** no, no, yes

## Words

- "Meal times"
- "Time zone: {zone}"
- "{meal} must be after {before}."
- "Days off"
- "Add a date"
- "Off {days}" (a list: "Off Sundays", "Off Sundays and 25 Oct", "Off Saturdays, Sundays and 25 Oct")

Hindi, Marathi and Arabic follow ADR 0012.

## Out of scope

- The cook telling the bot she's off: a later spec, as a chat command.
- Changing the time zone in Settings.
- Two planners: who gets asked, and how they agree.
- Different meal times on different days.
