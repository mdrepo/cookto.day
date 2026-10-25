# #260: Start in Telegram: the bot sets up the kitchen, without the website

- **Issue:** #260
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `apps/api/src/messenger/webhook.ts`: Start without a code; `packages/templates`: the bot's three new texts (`welcome`, `welcome_back`, `set_up`) and their buttons; `db/migrations/0010_start_in_telegram`: `auth_telegram_session` makes the account when the Telegram user has none ([ADR 0032](../docs/adr/0032-sql-migrations.md)); `apps/api/src/auth/telegram-app.ts`: passes the first name the proof carries; `apps/api/src/household/`: the bot's "set up" message when a household starts; `apps/web/src/features/telegram/useTelegramOpen.ts`: setup when there's no household; `apps/web/src/features/onboarding/`, `features/settings/useInvite.ts`: the steps and the cook's invite inside Telegram; `apps/web/src/share.ts`: sharing through Telegram's own picker. No new API route: the page uses the app's routes.

## Why

Today a family starts on the website, signs in through the bot, and only then hears from the bot. Most of the day happens in Telegram anyway, so starting there is natural: message the bot, answer the setup questions, done. The questions are the app's own, on the app's own page, opened inside Telegram, so there's one set of questions and words, and one way the household is saved.

## Decisions

- **Start with no code gets one button.** Someone who sends `/start` (or presses Start) with no code gets "Hello! I help your family plan its meals, and send them to your cook. Setting up takes a minute." with one button, "Set up your kitchen". It opens `https://cookto.day/#/telegram` inside Telegram, the page #241's "Change" opens.
- **The page makes the account.** The page signs in with the proof Telegram hands it, as for "Change". When that Telegram user has no account yet, one is made, with the same identity a sign-in code's Start makes (telegram, the user's id, their first name; [spec #216](216-sign-in-telegram.md)), and the page gets its session. A proof that fails Telegram's check, or is older than a day, is still refused.
- **No household: the app's setup.** Signed in with no household, the page shows the app's onboarding from its first step ([spec #65](65-onboarding.md), [#195](195-who-cooks.md)): where you live, who eats at home with their meals, who cooks, and "All set". "Go to my kitchen" starts the household with what they chose, exactly as signing in on the website does ([spec #217](217-households.md)): they're its planner, the time zone is the phone's ([spec #240](240-meal-times-and-days-off.md)), and meal times are the defaults, changed later in Settings. "Skip for now" works as in the app.
- **A household already: Today.** Signed in with a household, the page pulls it and shows Today, as for "Change". Nothing asks the setup questions again.
- **Someone else cooks: invite her next.** When setup said "Someone else cooks", "Go to my kitchen" opens Settings' Household with the invite for the cook already made: the code and "Send the link". Inside Telegram, "Send the link" opens Telegram's own picker of chats, with the bot's link and "Get the day's meals from me here:". She taps it and presses Start, as any cook's invite. On the website, "Send the link" stays the phone's share sheet.
- **The bot says it's set up.** When a household starts and its planner has a Telegram identity, from the website or from Telegram, the bot sends that planner "Your kitchen is set up. Each night at 10 I'll send you tomorrow's plan to check." Once per household.
- **Start with no code, again.** A planner who already has a household gets "You're set up." with "Open cookto.day", opening the same page (it shows Today). A cook gets the connected text again ([spec #207](207-connect-the-cook.md)). Start with a code is unchanged: sign-in, invite and cook codes work as today, and a bad code still says so.
- **Same API, no new routes.** The page uses the routes the app uses: `POST /api/auth/telegram`, the household's, and the invite's. The bot only answers Start and sends the "set up" text through the outbox.
- **No script from Telegram.** The page reads the proof from its address, as today, and talks to Telegram's window with Telegram's own events, without loading Telegram's script: the page's Content-Security-Policy stays as it is.

## Acceptance criteria

Criteria 1 to 4 are unit tests in `apps/api/test`, with the fake messenger and a fixed clock (ADR 0034). Criteria 5 to 8 are e2e tests on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), offline, with the API faked in the browser and the page opened with a made-up Telegram proof in its address, as #241's.

### 1. start with no code

- **Given** a Telegram user the API has never seen
- **When** the webhook gets Start with no code from them
- **Then** the bot replies "Hello! I help your family plan its meals…" with one button, "Set up your kitchen", that opens `https://cookto.day/#/telegram` inside Telegram
- **And** no account or household is made yet

### 2. the page makes the account, once

- **Given** a valid proof from Telegram user 42, first name "Asha", who has no account
- **When** `POST /api/auth/telegram` with it
- **Then** 200 with the name "Asha" and a session cookie; an account exists with the identity (telegram, 42, "Asha")
- **When** the same user's proof comes again
- **Then** the same account gets a new session, not a second account
- **When** a proof with a wrong hash, or older than a day, comes
- **Then** it's refused, and no account is made

### 3. start again

- **Given** Telegram user 42 is the planner of a household
- **When** the webhook gets Start with no code from them
- **Then** the bot replies "You're set up." with "Open cookto.day"
- **Given** instead a household's cook
- **Then** she gets the connected text
- **When** Start comes with an unknown code
- **Then** "That code didn't work…", as today

### 4. the bot says it's set up

- **Given** Telegram user 42's account with no household
- **When** it starts a household
- **Then** the bot sends 42 "Your kitchen is set up. Each night at 10 I'll send you tomorrow's plan to check."
- **When** the household's records are pushed again
- **Then** nothing more is sent

### 5. setup inside Telegram

- **Given** the page opened inside Telegram, for a Telegram user with no household
- **When** it opens
- **Then** they see "Where do you live?"
- **When** they choose two adults eating lunch and dinner and "I cook", then "Go to my kitchen"
- **Then** the API was asked to start a household holding those two people and their meals, and Today shows "2 people · 2 meals a day"

### 6. invite the cook from setup

- **Given** setup inside Telegram, with "Someone else cooks"
- **When** they press "Go to my kitchen"
- **Then** Household opens with an invite for the cook: a code like `KM7Q-4HTX` and "Send the link"
- **When** they press "Send the link"
- **Then** Telegram's picker is asked to share `https://t.me/cookto_day_bot?start=KM7Q4HTX` with "Get the day's meals from me here:"

### 7. a household already

- **Given** the page opened inside Telegram, for a planner whose household plans dinner tomorrow
- **When** it opens
- **Then** it shows Today with tomorrow's dinner, and no setup step

### 8. skip for now

- **Given** setup inside Telegram, on who eats
- **When** they press "Skip for now"
- **Then** the household starts with one adult eating lunch and dinner, and Today shows it

## Words

The bot's, in English until a native speaker reviews them (ADR 0012, 0031):

- "Hello! I help your family plan its meals, and send them to your cook. Setting up takes a minute."
- "Set up your kitchen"
- "You're set up."
- "Open cookto.day"
- "Your kitchen is set up. Each night at 10 I'll send you tomorrow's plan to check."

The app's, in English, Hindi, Marathi and Arabic:

- "Get the day's meals from me here:"

## Out of scope

- Asking the setup questions as chat messages. The page asks them; a later spec can move the one-answer questions (where you live, who cooks) into chat buttons if the page proves slow.
- Meal times and days off during setup: the defaults hold until changed in Settings, which also opens inside Telegram.
- A second planner joining from Telegram: one planner, as [spec #240](240-meal-times-and-days-off.md) decided.
- WhatsApp: the same flow there is a call-to-action link, for the WhatsApp channel's own spec.
