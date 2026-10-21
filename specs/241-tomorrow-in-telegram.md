# #241: Tomorrow's plan in Telegram: the planner says yes at 10 pm, the cook gets it with recipes

- **Issue:** #241
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged. [#240](240-meal-times-and-days-off.md) comes first.
- **Where it lives:** `packages/usecases`: `tomorrowText()`, moved out of `apps/web/src/features/home/useTomorrow.ts` so the app and the API write the plan the same way; `packages/workflows`: `tomorrow` (the planner's question) and `to_cook` (the cook's plan); `packages/templates`: their templates; `apps/api/src/workflows`: the actions `sorted`, `sendToCook` and `noCooking`, and the daily starter that makes each household's run at 10 pm its time; `packages/messenger`: a button that opens a page inside the chat (Telegram's web app button; on WhatsApp, a call-to-action link); `apps/web`: the recipes page `#/cook/<day>` and Tomorrow's new words. #207's 9 pm send from the phone goes.

## Why

The planner shouldn't have to remember to open the app every evening, and the cook shouldn't wait on it. The owner's flow: at night the planner gets tomorrow's plan; yes makes it final and the cook has it at once, with the recipes a tap away; no lets them change it or call it off.

## Decisions

- **At 10 pm, household time, the planner gets tomorrow's plan,** when tomorrow isn't sorted yet and has a plan. The text is "Share tomorrow"'s ([#195](195-who-cooks.md)), under "Tomorrow, Thursday:". Three buttons: "Looks good", "Change", "No cooking".
- **A plan already sorted in the app isn't asked about.** "Looks good" in the app still sends at once, as today. At 10 pm nothing goes to the planner.
- **"Looks good" sorts it and sends it.** The plan is marked sorted (the household fact from [#217](217-households.md)), the cook gets it straight away, and the planner's message is answered with "Sent to the cook."
- **"Change" opens Tomorrow inside Telegram.** It's a link button: the app's Tomorrow page opens in Telegram's own window. That window doesn't share the phone app's storage, so it signs in with the proof Telegram hands every page it opens (checked by the API with the bot's token, the same Telegram account as [#216](216-sign-in-telegram.md)'s sign-in) and pulls the household before showing Tomorrow. Changing the people, swapping a dish or picking another happens there, with the app's own controls. "Looks good" there sends as it does in the app, and the run ends without another message.
- **"No cooking" calls tomorrow off.** It asks "No cooking tomorrow? The cook will be told." with "Yes, tell her" and "Back". Yes adds tomorrow to the cook's days off ([#240](240-meal-times-and-days-off.md)), and she gets "No cooking tomorrow, Thursday. Enjoy the day off." "Back" shows the three buttons again.
- **Silence is yes, at 11 pm.** If the planner hasn't answered by 11 pm, the plan as it stands goes to the cook and is marked sorted, and the planner gets "Sent to the cook as planned." A change made in the app after that shows "Send again", as today.
- **The cook's day off.** When tomorrow is a day off, the planner still gets the 10 pm message, with "The cook is off tomorrow." at the top, and only "Looks good" and "Change". Nothing goes to the cook.
- **No plan for tomorrow, no message.** A household that hasn't planned tomorrow gets nothing; Today already asks in the app.
- **The cook's plan carries one link: "Recipes".** It opens `cookto.day/#/cook/2026-10-22` inside Telegram: tomorrow's dishes in the day's order, each with its photo, its amounts for the people eating it, and its recipe's own link (the app links to recipes, it doesn't copy them). The page needs no sign-in: the dishes and how many eat each are in its address, and nothing else is (`?d=breakfast.poha.3,lunch.dal-tadka.2`). It's in the cook's language, from the page address.
- **The 9 pm send from the phone goes.** Tomorrow's card no longer says "Goes to the cook at 9 pm". Before 10 pm it says "We'll ask you at 10 pm."; after it's sent, "Sent to the cook, 10:04 pm" as today.
- **The switches hold.** With the bot off, for everyone or for the household, nothing is asked and nothing is sent at 11 pm; the app's "Looks good" still sends, as it doesn't go through a run.

## Acceptance criteria

Criteria 1 to 8 are unit tests in `apps/api/test`, with the fake messenger, the runs in memory and a fixed clock (ADR 0034). Criteria 9 to 11 are e2e tests on an Android phone, an iPhone and a desktop, with the API faked in the browser.

### 1. the 10 pm question

- **Given** a household in Asia/Kolkata with tomorrow planned and not sorted
- **When** the cron runs at 21:59 and at 22:00 its time
- **Then** nothing at 21:59; at 22:00 the planner gets the plan with "Looks good", "Change" and "No cooking"; a second cron at 22:01 sends nothing more

### 2. looks good

- **When** the planner presses "Looks good"
- **Then** tomorrow is sorted in the household's records, the cook gets the plan with a "Recipes" link, and the planner gets "Sent to the cook."

### 3. already sorted

- **Given** tomorrow sorted in the app at 19:00
- **When** the cron runs at 22:00
- **Then** nothing is sent to anyone

### 4. change, in the app

- **Given** the planner was asked and pressed "Change"
- **When** they swap dinner in the app and press "Looks good" there
- **Then** the cook gets the new plan once, and the run is done; its buttons get "That's done already"

### 5. no cooking

- **When** the planner presses "No cooking", then "Yes, tell her"
- **Then** tomorrow is in the cook's days off, the cook gets "No cooking tomorrow, Thursday. Enjoy the day off.", and no plan goes to her at 11 pm
- **When** instead they press "Back"
- **Then** the three buttons come again, and nothing changed

### 6. silence

- **Given** the planner was asked and didn't answer
- **When** the cron runs at 23:00
- **Then** the cook gets the plan as it stands, tomorrow is sorted, and the planner gets "Sent to the cook as planned."

### 7. the cook's day off

- **Given** tomorrow is a Sunday, and Sundays are off
- **When** the cron runs at 22:00
- **Then** the planner gets "The cook is off tomorrow." with the plan, "Looks good" and "Change"; "Looks good" sorts it, and the cook gets nothing then or at 23:00

### 8. off switches

- **Given** the household's bot is off
- **When** the cron runs at 22:00 and 23:00
- **Then** nothing is sent

### 9. the recipes page

- **Given** a cook's "Recipes" link for poha for 3 and dal tadka for 2
- **When** it opens on a phone with no kitchen and no sign-in
- **Then** it shows Breakfast: poha, with amounts for 3, and Lunch: dal tadka, with amounts for 2, each with its photo and "Recipe" linking to its source; nothing asks to sign in or start onboarding

### 10. tomorrow's card

- **Given** a cook on Telegram and tomorrow planned at 18:00
- **When** the planner opens Today
- **Then** the card says "We'll ask you at 10 pm." and no longer "Goes to the cook at 9 pm"

### 11. Tomorrow, opened from Telegram

- **Given** the planner's household, and a page opened by "Change" with Telegram's proof for the planner's Telegram account
- **When** it loads
- **Then** it signs in, pulls the household and shows Tomorrow with tomorrow's plan; with a forged or expired proof it shows "Open this from the app." and nothing of the household

## Words

The bot, as templates (English; others when a native speaker reviews them, ADR 0034):

- `tomorrow_ask`: "Tomorrow, {day}:\n{plan}" with "Looks good", "Change", "No cooking"
- `tomorrow_ask_off`: "The cook is off tomorrow.\nTomorrow, {day}:\n{plan}" with "Looks good", "Change"
- `tomorrow_sent`: "Sent to the cook."
- `tomorrow_sent_silent`: "Sent to the cook as planned."
- `no_cooking_ask`: "No cooking tomorrow? The cook will be told." with "Yes, tell her", "Back"
- `to_cook_plan`: "Tomorrow, {day}:\n{plan}" with the link "Recipes"
- `to_cook_off`: "No cooking tomorrow, {day}. Enjoy the day off."

The app: "We'll ask you at 10 pm." in place of "Goes to the cook at 9 pm", "Open this from the app.", and on the recipes page "Recipe", the meal names and "for {n}" as Today already has. Hindi, Marathi and Arabic follow ADR 0012.

## Out of scope

- Picking other dishes inside the chat: "Change" opens the app, which already does it.
- Asking at a time other than 10 pm, or the cook's plan at another time.
- Two planners.
- The meal checks: [#242](242-meal-checks.md).
