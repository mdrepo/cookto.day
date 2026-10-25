# #270: The bot talks like a person: names, one sentence a message, confirmations, changes that reach the cook, and commands

- **Issue:** #270
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged. It changes [#241](241-tomorrow-in-telegram.md)'s messages and its "Change" button.
- **Where it lives:**
  - `packages/messenger`: a message that arrives silently (Telegram's `disable_notification`); a typed command as an event of its own, with the sender's first name on every event; each chat's command menu (`setMyCommands` with the chat's scope).
  - `packages/engine`: `eatersOn(slot, members, day)`, the people eating a meal on a day once who's out and the guests are counted, which `servings()` then counts.
  - `packages/data`: the collection `eating`, one record per day and meal, with who's out and how many guests, synced like `plans`.
  - `packages/usecases`: `mealIdeas()`, each meal's ranked ideas, moved out of `apps/web/src/features/home/useMealPlans.ts` so the app and the API rank the same way; `planChanges(before, after)`, what changed in a day's plan, in words the bot sends.
  - `packages/workflows`: `tomorrow` with "Change" as steps in the chat; `to_cook` with "Got it"; `plan_change`; one workflow per command.
  - `packages/templates`: every message below.
  - `apps/api/src/messenger`: the commands, by role.
  - `apps/api/src/workflows`: their actions; the run made two minutes after a sent day's plan changes; "not seen yet".
  - `db/migrations/0011_*`: the cook's first name.
  - `apps/web`: counts from `eating` on Today and Tomorrow; Tomorrow's line after a change.

## Why

The owner, on the 25 Oct 2026 plan for Monday: it reads like a system notice, it doesn't use what the family told it, and you can't tell the bot anything without opening the app. The bot should text like a person in the house: by name, one short message at a time, saying what it did after every tap, and taking a quick instruction in the chat.

## Decisions

### How the bot talks

- **One sentence, one message.** Every message the bot sends is split into its sentences, each sent as a message of its own, in order. Only the first one makes a sound; the rest arrive silently. The buttons go on the last message. A list (`/list`) stays one message.
- **Names.**
  - **The planner** is called by the first name kept at sign-in.
  - **The cook** is called by the first name on their Telegram account. It's kept when they connect, and for a cook connected before this change, at their next message or tap. Until then, "the cook".
  - **Family members** are named by their nickname from the app. Someone without a nickname is counted, not named.
- **Counts on every meal.** "Lunch for 3: Kadhi pakora." The count is the meal's eaters that day ([ADR 0026](../docs/adr/0026-meals-belong-to-people.md)), less who's out, plus guests. "For Aarav: Paneer paratha." when a meal has the child's own dish and one child eats it; "For the children: …" when several do.
- **One reason, when there is one.** When a dish uses pantry food that goes off within two days, its line says so: "Lunch for 3: Kadhi pakora. It uses the curd, which goes off Tuesday." Nothing else is given as a reason.
- **Every tap gets a reply** saying what happened (the table below). A tap on a finished question still answers "That's done already."

### Tomorrow's plan, at 10 pm

- **The planner's question,** in place of [#241](241-tomorrow-in-telegram.md)'s:
  > Hi Mayur, here's tomorrow, Monday.
  > Breakfast for 4: Poha.
  > Lunch for 3: Kadhi pakora. It uses the curd, which goes off Tuesday.
  > For Aarav: Paneer paratha.
  > Dinner for 4: Thalipeeth.
  > Shall I send it to Sunita? **[Send it] [Change] [No cooking]**

  "Send it" does what "Looks good" did. On the cook's day off, the first message is "Sunita is off tomorrow, Monday." and the last is "Does this look right?" with **[Looks good] [Change]**.
- **The cook's plan:**
  > Hi Sunita, here's tomorrow, Monday, from Mayur.
  > *(the meals, as above, without reasons)*
  > Tap Got it once you've seen it. **[Got it] [Recipes]**
- **"Got it"** answers the cook with "Thanks." and tells the planner "Sunita saw tomorrow's plan ✓". With no "Got it" by an hour before the day's first meal, the planner gets "Sunita hasn't seen tomorrow's plan yet." once.

### Change, in the chat

- **"Change" asks which meal,** with a button for each of the day's meals and "Open the app" (opens Tomorrow inside Telegram, as #241's "Change" does now).
- **A meal shows three other ideas,** the next three Tomorrow shows for it: "Instead of Kadhi pakora:" with **[Rajma] [Chole] [Dal tadka] [More in the app]**.
- **Picking one swaps it,** written to the household's records as a phone's swap is ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)). The bot answers "Lunch is Rajma now." and asks again "Shall I send it to Sunita?" with the three buttons. The earlier question's buttons answer "That's done already."

### A change after the plan went to the cook

- **The cook gets only what changed,** two minutes after the last change, so a few quick edits go as one message. "A change for tomorrow, Monday." "Lunch is Rajma, not Kadhi pakora." "Dinner is for 3 now." Then **[Got it] [Recipes]**.
- **What counts as a change:** a meal's dish swapped (in the app or the chat), the child's dish, who's out, guests, and a meal added or taken off. A change made anywhere counts: the app, the chat, or another planner's phone.
- **The planner hears it went:** "Sent the change to Sunita." Then "Sunita saw the change ✓" on "Got it", or after 30 minutes without one, "Sunita hasn't seen the change yet."
- **Close to the meal, the planner says first.** When a changed meal starts within the hour, the planner gets "Lunch is at 1 pm. Sunita may have started. Send the change anyway?" with **[Send it] [Don't send]**. "Don't send" keeps the change in the plan and tells the cook nothing.
- **A meal that has started isn't sent.** A change to a meal whose time has passed goes to nobody.
- **"Send again" goes from Tomorrow** when the cook is on Telegram. After a change, the line under the plan says "Sunita will get the change." and then "Sent the change to Sunita, 10:12 pm".

### Commands

- **The commands answer in the chat, with buttons.** The website opens only for what doesn't fit in a chat: a recipe, setup, My dishes.
- **Each chat's menu has its role's commands,** set when the chat connects, so typing "/" shows them.
- **A command from someone without a household** gets #260's "Set up your kitchen". **An unknown command** gets "I don't know that one. Type / to see what I can do."

| Who | Command | What happens in the chat |
|---|---|---|
| Planner | `/tomorrow` | Not sorted yet: the 10 pm question, now. Already sent: the plan, then "Sent to Sunita at 10:04 pm." and "She's seen it ✓" or "She hasn't seen it yet." Nothing planned: "Tomorrow isn't planned yet." with **[Open the app]**. |
| Planner | `/today` | "Here's today, Sunday." then each meal: "Lunch for 3: Rajma. Made ✓", "… Not yet" or "… Not made". |
| Planner | `/out` | "Who's out?" with a button per family member. Then "When?" with **[Today] [Tomorrow]**. Then "Which meals?" with that person's meals still to come that day, and **[All day]**. Answer: "Got it. Priya's out for dinner tomorrow. Dinner is for 3 now." |
| Planner | `/guests` | "How many guests?" with **[1] [2] [3] [4] [5+]**; 5+ asks for a number. Then "When?" with **[Today] [Tomorrow]**. Then "Which meal?" with that day's meals still to come. Answer: "Got it. Dinner tomorrow is for 6 now." |
| Planner | `/off` | "Which day is Sunita off?" with **[Tomorrow] [Day after]**. Answer: "Got it. Sunita is off on Tuesday. I've told her." The day joins the cook's days off ([#240](240-meal-times-and-days-off.md)). The cook gets "No cooking on Tuesday. Enjoy the day off." |
| Planner | `/list` | "To buy: milk, besan, curd." with **[Open the list]**. When it's empty: "Nothing to buy." |
| Cook | `/tomorrow`, `/today` | The plan as the cook got it, with **[Recipes]**. Nothing sent yet: "Tomorrow's plan comes at 10 pm." |
| Cook | `/ranout` | "What ran out? Send its name." The answer is matched as [#242](242-meal-checks.md)'s is. Answer: "Added milk to the shopping list." The planner gets "Sunita says milk ran out. It's on the list." |

- **Who's out and guests change the plan everywhere:**
  - the counts on the phone's Today and Tomorrow;
  - the amounts on the cook's Recipes page;
  - what [#242](242-meal-checks.md)'s "Yes" takes from the pantry;
  - once the plan was sent, a change for the cook.

  A meal with nobody left to eat it is taken off that day's plan.
- **The switches hold.** With the bot off, for everyone or for the household, commands answer "I'm switched off for now." and nothing is sent to the cook.

## Acceptance criteria

Criteria 1 to 15 are unit tests in `apps/api/test`, with the fake messenger, the runs in memory and a fixed clock (ADR 0034). Criterion 16 is a unit test in `packages/engine/test`. Criteria 17 and 18 are e2e tests on an Android phone, an iPhone and a desktop, with the API faked in the browser.

### 1. one sentence, one message, one sound

- **Given** Mayur, a planner, and a plan for tomorrow, Monday, with lunch and dinner
- **When** the cron runs at 22:00
- **Then** Mayur gets four messages in order: "Hi Mayur, here's tomorrow, Monday.", the lunch line, the dinner line, and "Shall I send it to Sunita?". Only the first makes a sound, and only the last has buttons.

### 2. counts, the child's dish and the reason

- **Given** four people eat dinner, one adult eats lunch out of three, Aarav is the only child and has paneer paratha at lunch, and the curd goes off on Tuesday
- **When** the 10 pm question is written
- **Then** it says "Lunch for 3: Kadhi pakora. It uses the curd, which goes off Tuesday.", "For Aarav: Paneer paratha." and "Dinner for 4: Thalipeeth."

### 3. the cook's name

- **Given** a cook who connected before this change, so the household doesn't know their name yet
- **When** they tap any button, as Sunita on Telegram
- **Then** from then on the planner's messages say "Sunita", where before they said "the cook"

### 4. got it

- **Given** the plan was sent to Sunita at 22:04
- **When** Sunita taps "Got it"
- **Then** Sunita gets "Thanks.", and Mayur gets "Sunita saw tomorrow's plan ✓"

### 5. not seen

- **Given** the plan was sent at 22:04, breakfast is at 08:00, and Sunita hasn't tapped "Got it"
- **When** the cron runs at 06:59, 07:00 and 07:01
- **Then** Mayur gets "Sunita hasn't seen tomorrow's plan yet." at 07:00, and nothing at 06:59 or 07:01

### 6. change in the chat

- **Given** the 10 pm question
- **When** Mayur taps "Change", "Lunch", then "Rajma"
- **Then**:
  - "Which meal?" shows a button for each meal, plus "Open the app".
  - "Instead of Kadhi pakora:" shows the three ideas Tomorrow ranks next, plus "More in the app".
  - Lunch is Rajma in the household's records.
  - Mayur gets "Lunch is Rajma now." and the question again.
  - The first question's buttons answer "That's done already."

### 7. a change after sending

- **Given** the plan was sent to Sunita
- **When** Mayur's phone swaps lunch to Rajma at 22:30 and sets dinner for 3 at 22:31
- **Then**:
  - At 22:33, Sunita gets "A change for tomorrow, Monday.", "Lunch is Rajma, not Kadhi pakora.", "Dinner is for 3 now." with "Got it" and "Recipes", once.
  - Mayur gets "Sent the change to Sunita."

### 8. the change seen, or not

- **Given** a change sent at 22:33
- **When** Sunita taps "Got it"
- **Then** Mayur gets "Sunita saw the change ✓"
- **When** instead nobody taps by 23:03
- **Then** Mayur gets "Sunita hasn't seen the change yet.", once

### 9. too close to the meal

- **Given** today's plan went to Sunita and lunch is at 13:00
- **When** Mayur swaps lunch at 12:20
- **Then**:
  - Mayur gets "Lunch is at 1 pm. Sunita may have started. Send the change anyway?" with "Send it" and "Don't send".
  - "Send it" sends the change.
  - "Don't send" sends nothing, and lunch stays swapped.
- **When** instead he swaps lunch at 13:10
- **Then** nobody is sent anything

### 10. the command menus

- **When** a planner's chat connects, and when a cook's chat connects
- **Then** each chat's menu is set with its role's commands, as the table lists them

### 11. /tomorrow

- **Given** tomorrow is planned and not sorted, at 18:00
- **When** Mayur sends /tomorrow
- **Then** he gets the 10 pm question at once, and at 22:00 he isn't asked again
- **Given** instead the plan was sent at 22:04 and seen
- **Then** he gets the plan, "Sent to Sunita at 10:04 pm." and "She's seen it ✓"

### 12. /out

- **Given** four people eat dinner tomorrow, and the plan was sent
- **When** Mayur sends /out, then taps "Priya", "Tomorrow" and "Dinner"
- **Then**:
  - He gets "Got it. Priya's out for dinner tomorrow. Dinner is for 3 now."
  - The `eating` record says Priya is out for tomorrow's dinner.
  - Two minutes later, Sunita gets "Dinner is for 3 now." as a change.

### 13. /guests and /off

- **When** Mayur sends /guests, then taps "2", "Tomorrow" and "Dinner"
- **Then** he gets "Got it. Dinner tomorrow is for 6 now."
- **When** he sends /off, then taps "Day after"
- **Then**:
  - The day after tomorrow is in the cook's days off.
  - Sunita gets "No cooking on Tuesday. Enjoy the day off."
  - Mayur gets "Got it. Sunita is off on Tuesday. I've told her."

### 14. /today, /list and /ranout

- **Given** breakfast was made today and lunch wasn't
- **When** Mayur sends /today
- **Then** he gets "Breakfast for 4: Poha. Made ✓", "Lunch for 3: Rajma. Not made" and "Dinner for 4: Thalipeeth. Not yet"
- **When** he sends /list, with milk and besan on the list
- **Then** he gets "To buy: milk, besan." as one message, with "Open the list"
- **When** Sunita sends /ranout, then "milk"
- **Then**:
  - Milk is on the shopping list.
  - Sunita gets "Added milk to the shopping list."
  - Mayur gets "Sunita says milk ran out. It's on the list."

### 15. strangers, unknown commands and the switch

- **When** someone with no household sends /today
- **Then** they get "Set up your kitchen"
- **When** Mayur sends /hello
- **Then** he gets "I don't know that one. Type / to see what I can do."
- **Given** the household's bot is off
- **When** Mayur sends /tomorrow
- **Then** he gets "I'm switched off for now.", and nothing goes to Sunita

### 16. who eats, on a day

- **When** `eatersOn()` gets four people who eat dinner, Priya out for tomorrow's dinner, and two guests at tomorrow's dinner
- **Then** tomorrow's dinner has 5 eaters, and today's has 4
- **When** everyone eating a meal is out
- **Then** that meal has none

### 17. counts on the phone

- **Given** a signed-in household where Priya is out for tomorrow's dinner, set from the chat
- **When** the planner opens Today after 16:00
- **Then** tomorrow's dinner says "for 3"

### 18. Tomorrow after a change

- **Given** a cook on Telegram, and tomorrow's plan sent at 22:04
- **When** the planner swaps dinner on Tomorrow
- **Then** the line under the plan says "Sunita will get the change.", and there's no "Send again"

## Words

The bot, as templates (English only, by the owner's call; other languages follow [ADR 0034](../docs/adr/0034-workflows-and-templates.md) when a native speaker reviews them):

- **The plan:**
  - "Hi {name}, here's tomorrow, {day}."
  - "{Meal} for {n}: {dish}."
  - "It uses the {food}, which goes off {day}."
  - "For {child}: {dish}." and "For the children: {dish}."
  - "Shall I send it to {cook}?" with "Send it", "Change", "No cooking"
  - "{cook} is off tomorrow, {day}." and "Does this look right?" with "Looks good", "Change"
- **The cook's plan:**
  - "Hi {cook}, here's tomorrow, {day}, from {name}."
  - "Tap Got it once you've seen it." with "Got it", "Recipes"
  - "Thanks."
- **Seen or not:**
  - "{cook} saw tomorrow's plan ✓"
  - "{cook} hasn't seen tomorrow's plan yet."
- **Change in the chat:**
  - "Which meal?" with "Open the app"
  - "Instead of {dish}:" with "More in the app"
  - "{Meal} is {dish} now."
- **Changes after sending:**
  - "A change for tomorrow, {day}." (or "for today")
  - "{Meal} is {dish}, not {was}."
  - "{Meal} is for {n} now."
  - "No {meal} tomorrow." and "{Meal} is back: {dish}."
  - "Sent the change to {cook}."
  - "{cook} saw the change ✓"
  - "{cook} hasn't seen the change yet."
  - "{Meal} is at {time}. {cook} may have started. Send the change anyway?" with "Send it", "Don't send"
- **The commands' replies and buttons,** as the table says them:
  - "Tomorrow isn't planned yet."
  - "Here's today, {day}."
  - "Made ✓", "Not yet", "Not made"
  - "Who's out?", "When?", "Which meals?", "Which meal?", "All day"
  - "How many guests?", "How many?"
  - "Which day is {cook} off?", "Tomorrow", "Day after"
  - "Got it. …"
  - "To buy: {items}." and "Nothing to buy." with "Open the list"
  - "Tomorrow's plan comes at 10 pm."
  - "{cook} says {food} ran out. It's on the list."
  - "I don't know that one. Type / to see what I can do."
  - "I'm switched off for now."
- **The menu:**
  - `/tomorrow` "Tomorrow's plan"
  - `/today` "Today's plan"
  - `/out` "Someone's eating out"
  - `/guests` "Guests are coming"
  - `/off` "The cook's day off"
  - `/list` "The shopping list"
  - `/ranout` "Something ran out"

These words replace #241's `tomorrow_ask`, `tomorrow_ask_off`, `tomorrow_sent`, `tomorrow_sent_silent` and `to_cook_plan`. Without a name, `{cook}` is "the cook" and the greeting drops the name.

The app: "{cook} will get the change." and "Sent the change to {cook}, {time}", in English, Hindi, Marathi and Arabic (ADR 0012).

## Out of scope

- Other languages for the bot, by the owner's call.
- Family members changing the plan, or having commands of their own.
- Typed sentences ("Priya's out tonight"): only commands and buttons are read. Messages the bot can't read are counted, never stored, so we can see later how often people type.
- Planning tomorrow from the chat when the phone hasn't planned it.
- The household's own dishes, set at setup: later, by the owner's call.
- Renaming the cook in the app.
