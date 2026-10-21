# #242: Did you make it? The cook's meal checks, and the pantry follows the recipe

- **Issue:** #242
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged. [#240](240-meal-times-and-days-off.md) and [#241](241-tomorrow-in-telegram.md) come first.
- **Where it lives:** `packages/engine`: `usedBy(dishes, eaters, pantry)`, the amounts a meal takes from the pantry; `packages/workflows`: `meal_check` and `day_end`; `packages/templates`: their templates; `apps/api/src/workflows`: the actions `made` (cooked records and the pantry), `notMade` (the reason, and the planner told), `ranOut` (the shopping list), and the starter that makes each meal's check; the server writes records through the same versions and changes log as a phone ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)).

## Why

The plan says what should be cooked; nobody records what was. The cook is the one who knows, and she's on Telegram. A yes keeps the pantry true without anyone weighing anything; a no tells the planner straight away, while there's still time to do something about it.

This replaces [#195](195-who-cooks.md)'s "No streaks, no reminders, no 'did you cook?'". The owner decided on 21 Oct 2026 that the cook is asked: the question goes to the person who did the work, not to the planner.

## Decisions

- **One hour after each meal, the cook is asked about it.** For each meal the household eats today, at its time from [#240](240-meal-times-and-days-off.md) plus an hour: "Did you make lunch?\nDal tadka, rice" with "Yes" and "No". Only on a day the plan went to her ([#241](241-tomorrow-in-telegram.md)) and she's cooking (not a day off).
- **Yes counts it cooked and takes the recipe's amounts from the pantry.** Each of the meal's dishes is added to what was cooked that day ([#104's](104-cooked-it.md) cooked records), as "Cooked it" does in the app. For each ingredient the pantry holds with an amount in the recipe's unit, the recipe's amount for one person, times the people who ate it (the meal's eaters, [ADR 0026](../docs/adr/0026-meals-belong-to-people.md)), is taken off; an extra for the child takes its own amount. What reaches zero is used up, as "Used up" does. Food the pantry has with no amount ("have it"), food in another unit, and food it doesn't have are left alone. She gets "Thanks."
- **No asks why.** "What happened?" with "Made other food", "Didn't cook it", "Ran out of something". Nothing is counted cooked and nothing leaves the pantry. The planner gets "Lunch wasn't made: {reason}." at once.
- **"Ran out of something" asks what.** "What ran out? Send its name." Her next text is matched against the packs' food names ([#148](148-food-names.md)): what matches goes on the shopping list, and she gets "Added milk to the shopping list."; what doesn't is passed on in the planner's message as she wrote it. The planner's message waits for her answer (until the end of the day), so it says "Lunch wasn't made: ran out of milk."
- **What she doesn't answer comes as one message at the end of the day.** One hour after the day's last check, the meals she hasn't answered come together: "Not answered today: breakfast, lunch." with "Made them all", "Some of them", "None of them". All counts each as Yes; none counts each as No with "Didn't say"; some asks about each of those meals in turn, Yes or No. The single checks' buttons then answer "That's done already."
- **Silence after that changes nothing.** The day's message lasts until 6 am. Unanswered, nothing is counted and the planner isn't told.
- **A meal she said No to can still be made in the app.** The planner's "Cooked it" works as today; the bot doesn't ask twice.
- **The switches hold.** With the bot off, no checks are sent.

## Acceptance criteria

Criteria 1 to 8 are unit tests in `apps/api/test`, with the fake messenger, runs in memory and a fixed clock. Criterion 9 is a unit test in `packages/engine/test`.

### 1. an hour after the meal

- **Given** a household in Asia/Kolkata eating lunch at 13:00 and dinner at 20:00, today's plan sent to the cook
- **When** the cron runs at 13:59, 14:00 and 14:01
- **Then** nothing at 13:59; at 14:00 she gets "Did you make lunch?" with the lunch dishes, "Yes" and "No"; nothing more at 14:01

### 2. yes

- **Given** lunch is dal tadka for 2, which takes 80 g toor dal and 1 piece onion per person, and the pantry has 500 g toor dal, 1 piece onion and rice with no amount
- **When** she presses "Yes"
- **Then** dal tadka is cooked today; the pantry has 340 g toor dal, onion used up, rice unchanged; she gets "Thanks."

### 3. no, and why

- **When** she presses "No", then "Didn't cook it"
- **Then** nothing is cooked or taken from the pantry, and the planner gets "Lunch wasn't made: didn't cook it."

### 4. ran out

- **When** she presses "No", "Ran out of something", and sends "milk and kasuri methi"
- **Then** milk is on the shopping list; she gets "Added milk to the shopping list."; the planner gets "Lunch wasn't made: ran out of milk and kasuri methi."

### 5. the end of the day

- **Given** dinner at 20:00 is the last meal, and breakfast and lunch weren't answered
- **When** the cron runs at 22:00
- **Then** she gets "Not answered today: breakfast, lunch." with the three buttons; the breakfast and lunch checks' buttons now answer "That's done already"
- **When** she presses "Some of them", then Yes for breakfast and No for lunch
- **Then** breakfast is cooked with its amounts taken, and the planner gets "Lunch wasn't made: didn't say."

### 6. silence

- **Given** the end-of-day message wasn't answered
- **When** the cron runs at 6:00
- **Then** nothing is cooked, nothing is taken, and nobody is told

### 7. days off and unsent plans

- **Given** today is a day off, or today's plan never went to the cook
- **When** the cron runs through the day
- **Then** no check is sent

### 8. the planner's phone sees it

- **Given** she answered Yes for lunch
- **When** the planner's phone pulls
- **Then** Today shows lunch cooked and the kitchen shows the new amounts, as if the planner had pressed "Cooked it"

### 9. what a meal uses

- **When** `usedBy()` is given dal tadka for 2 (80 g toor dal, 1 piece onion per person), a child's khichdi with its extra ghee, and a pantry with toor dal in grams, onion in pieces, ghee in ml, rice with no amount, and no tomato
- **Then** it returns 160 g toor dal, 2 pieces onion and the child's ghee, and nothing for rice or tomato

## Words

The bot, as templates (English; others when a native speaker reviews them, ADR 0034):

- `check_ask`: "Did you make {meal}?\n{dishes}" with "Yes", "No"
- `check_thanks`: "Thanks."
- `check_why`: "What happened?" with "Made other food", "Didn't cook it", "Ran out of something"
- `check_ran_out`: "What ran out? Send its name."
- `check_added`: "Added {foods} to the shopping list."
- `check_not_made`: "{meal} wasn't made: {reason}." (to the planner)
- `day_end_ask`: "Not answered today: {meals}." with "Made them all", "Some of them", "None of them"

The reasons as the planner reads them: "made other food", "didn't cook it", "ran out of {what}", "didn't say".

## Out of scope

- How much was made: Yes means the plan's amounts for the people planned.
- What the other food was, when she made something else.
- Asking the planner when the cook doesn't answer, or a summary of the day.
- Leftovers, and food thrown away.
