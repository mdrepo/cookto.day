# #207: Connect the cook's Telegram, and tomorrow's plan reaches her by itself

- **Issue:** #207
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `packages/messenger` (new, [ADR 0031](../docs/adr/0031-messenger.md)): `Messenger`, the kinds registry (text, photo, buttons, edit), `Store`, `drain()`, `telegram()`, the fakes, the contract tests; `db/migrations/0001_messenger` ([ADR 0032](../docs/adr/0032-sql-migrations.md)): `conversations`, `messages`, `outbox`, `links`, their functions and policies; `apps/api`: `network.ts` (the one `fetch`), `messenger/store.ts` (Postgres over HTTPS), `messenger/routes.ts` (the routes below), the `scheduled` handler that drains the outbox, the bot's reply words; `apps/web/wrangler.jsonc`: the cron trigger; `packages/data`: `settings.cook` (the link's token and when it connected; per phone, not synced) and its first network adapter, `network.ts` (our API only, 15-second timeout, ADR 0024); `packages/usecases`: `connectCook()`, `disconnectCook()`, `sendTomorrow()`, `scheduleTomorrow()`; `apps/web`: `features/settings/` (CookLink, under Who cooks) and `features/home/Tomorrow` (sent, scheduled, send again).

## Why

The planner decides tomorrow on their phone. The cook is on her own phone, and the plan reaches her by copy and paste ("Share tomorrow", #195). It should reach her by itself, without her installing anything or signing in. The owner's words: cookto.day is "the message you send your helper".

## Decisions

- **Connecting is in Settings, under Who cooks, on a phone that plans.** "Connect the cook's Telegram" shows one line first: "The plan goes through Telegram, and what you both send is kept for 90 days. Nothing else leaves your phone." Then "Connect".
- **A code, and a link to send her.** The phone asks the API for a link. It shows the code (8 characters, letters and digits without 0, O, 1 and I, as `KM7Q-4HTX`) and "Send the link": the share sheet with `https://t.me/cookto_day_bot?start=KM7Q4HTX`. She taps the link and presses Start, or types `/start KM7Q4HTX` to the bot. The code lasts ten minutes and works once.
- **The phone asks every 3 seconds whether she has connected,** while the screen is open, with the link's token in a header. Connected, it keeps the token and shows "Connected" and "Disconnect".
- **"Looks good" sends now.** The text is exactly "Share tomorrow"'s (#195, criterion 4). The sorted card then says "Sent to the cook, 7:12 pm". "Share tomorrow" stays, for everyone.
- **Silence is yes, and the cook still gets it.** Opening Tomorrow from 4 pm, with a cook connected, schedules the plan as it stands for 9 pm; the card says "Goes to the cook at 9 pm". A change reschedules it with the new text; "Looks good" sends now and cancels it. At 9 pm the server sends it without the phone. Nothing is scheduled if the planner never opens the app that evening: the automatic send without any opening comes with sync.
- **A change after sending shows "Send again."** Swapping a dish, or a changed prep or buy line, makes the card say "Changed since you sent it"; nothing is sent until the planner presses it.
- **Sending can fail.** No network, or the API says no: "Couldn't send. Try again." and "Send again". The plan stays sorted; the API's outbox retries a message Telegram didn't accept, so "Couldn't send" means the API itself wasn't reached.
- **The cook can leave.** `/stop` deletes her conversation and its messages; the next send answers "The cook disconnected. Connect again in Settings." and Settings shows "Connect the cook's Telegram" again.
- **What the bot says**, in English:
  - Start with a good code: "Connected. I'll send you tomorrow's plan each evening. What we send each other is kept for 90 days. Send /stop any time to stop, and it's all deleted."
  - Start with a bad or used code: "That code didn't work. Ask for a new one in the app."
  - `/stop`: "Stopped and deleted. Nothing more will come from me."
  - anything else: "I can't read replies yet. Tomorrow's plan comes from the app." The message is still recorded in the conversation.
- **The Worker installs its own webhook.** `GET /api/health/keys` checks that Telegram's webhook is `https://cookto.day/api/messenger/telegram` and sets it when it isn't, reporting `webhook: "set"`. The runbook's step 3 becomes: open the health page once.
- **The routes:** `POST /api/messenger/links` (make a link), `GET /api/messenger/links/{code}` (connected yet?), `DELETE /api/messenger/links` (disconnect: deletes the conversation too), `POST /api/messenger/send` (with `at` to schedule; a new `at` for the same `context` replaces the one waiting), `DELETE /api/messenger/send/{id}` (cancel a scheduled one), and `POST /api/messenger/telegram` (the webhook). Each needs the link's token in `authorization: Bearer`, except making a link and the webhook. Limits per link: 20 sends a day (UTC), 2,000 characters.
- **Limits on making links:** 10 a day per network address (hashed, as in ADR 0028).
- **The outbox is drained** every minute by the cron trigger and at once after each `send`. A row Telegram refuses is retried after 1, 5 and 30 minutes, then marked failed.

## Acceptance criteria

Criteria 1 to 8 are e2e tests on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), offline, with the API faked in the browser (ADR 0025). Criteria 9 to 16 are unit tests in `apps/api/test` with the fake messenger and the fake store. Criteria 17 and 18 are the package's contract tests, run against the fake store and, in CI, against the migration on a throwaway Postgres (ADR 0032).

### 1. connect the cook

- **Given** "I plan the meals", and Settings open
- **When** they press "Connect the cook's Telegram"
- **Then** they see the one line about Telegram and 90 days, and "Connect"
- **When** they press "Connect"
- **Then** they see a code like `KM7Q-4HTX`, "Send the link", and "Waiting for the cook"
- **When** the cook connects (the fake API says so)
- **Then** it says "Connected", with "Disconnect"; and the code is gone

### 2. the code runs out

- **Given** a code shown, and ten minutes passing with nobody connecting
- **Then** it says "That code ran out", with "Try again"
- **When** they press "Try again"
- **Then** a new code is shown

### 3. looks good sends now

- **Given** the cook connected, North Indian loaded, and it's 7 pm
- **When** they press "Looks good"
- **Then** it says "Tomorrow's sorted", and "Sent to the cook, 7:00 pm"
- **And** what the API was asked to send reads, line by line, the same as "Share tomorrow"'s text (#195, criterion 4), with no `at`

### 4. silence is yes, and it still goes

- **Given** the cook connected, and it's 7 pm
- **When** they open Today and press nothing
- **Then** "Tomorrow" says "Goes to the cook at 9 pm", and the API was asked to send the plan's text at 9 pm
- **When** they pick another idea for dinner
- **Then** the API was asked again, with the new dish, replacing the first
- **When** they press "Looks good"
- **Then** it says "Sent to the cook, 7:00 pm", and the scheduled one was cancelled

### 5. couldn't send

- **Given** the cook connected, and the API not answering
- **When** they press "Looks good"
- **Then** it says "Tomorrow's sorted", "Couldn't send. Try again.", and has "Send again"
- **When** the API is back and they press "Send again"
- **Then** it says "Sent to the cook"

### 6. send again after a change

- **Given** tomorrow sent
- **When** they change dinner's pick
- **Then** the card says "Changed since you sent it", with "Send again"
- **When** they press "Send again"
- **Then** it says "Sent to the cook" with the new time, and the text sent has the new dish

### 7. not connected, nothing changes

- **Given** no cook connected, and it's 7 pm
- **When** they open Today and press "Looks good"
- **Then** it says "Tomorrow's sorted", with "Change" and "Share tomorrow", and no "Sent" or "Goes to" line; the API wasn't asked anything

### 8. disconnect, and the cook leaving

- **Given** the cook connected
- **When** they press "Disconnect" in Settings
- **Then** it says "Connect the cook's Telegram" again, and "Looks good" no longer sends
- **Given** the cook connected, and she has sent `/stop` (the API answers that the link is gone)
- **When** they press "Looks good"
- **Then** it says "The cook disconnected. Connect again in Settings."

### 9. a link is made

- **When** `POST /api/messenger/links`
- **Then** 201 with a code of 8 allowed characters, a token, and when the code runs out (10 minutes); the store holds the code and a hash of the token, never the token

### 10. the cook connects, once

- **Given** a link
- **When** the webhook gets Start with its code, with the right secret
- **Then** a conversation exists for that chat, owned by the link; the bot's "Connected…" reply is in the outbox and then sent; and `GET /api/messenger/links/{code}` with the token says connected
- **When** the same code arrives again, from any chat
- **Then** the bot replies "That code didn't work…", and nothing else changes

### 11. the webhook secret, and an update seen twice

- **When** an update arrives without the secret, or with a wrong one
- **Then** 401, nothing is stored, and nothing is sent
- **When** the same `update_id` arrives twice
- **Then** the second is dropped: one message row, one reply

### 12. sending, now and later

- **Given** a connected link
- **When** `POST /api/messenger/send` with its token and a text
- **Then** 202 with the message's id, a *queued* row with the context, and after the drain Telegram was asked to send that text to that chat, the row is *sent* with Telegram's message id, and the outbox is empty
- **When** the same, with `at` an hour away
- **Then** the row waits; a drain now sends nothing; a drain at that time sends it
- **When** a second send carries the same `context` and a new `at`
- **Then** the first waiting row is cancelled and only the second is sent
- **When** the token is missing or unknown
- **Then** 404, and nothing is stored
- **When** it's the 21st send of the day, or the text is over 2,000 characters
- **Then** 429 or 413, and nothing is stored

### 13. the drain is safe

- **Given** two queued rows in one conversation
- **When** two drains run at once
- **Then** each row is sent exactly once, in order
- **Given** a row marked *sending* with no message id, from a crash
- **When** a drain runs
- **Then** it isn't sent again; it's marked *unknown*
- **Given** Telegram refusing a row
- **When** drains run over the next hour
- **Then** it's retried after 1, 5 and 30 minutes, then marked *failed* with the error

### 14. stop

- **Given** a connected link with messages both ways
- **When** the webhook gets `/stop` from its chat
- **Then** the bot replies "Stopped and deleted…", and the conversation, its messages and the link are gone: a send with the token answers 404

### 15. anything else is kept, and answered once

- **Given** a connected link
- **When** the webhook gets a text, a photo or a button from that chat
- **Then** it's a message row in the conversation (a photo as its file reference, never the file), the handler gets one event, and the bot replies "I can't read replies yet…"

### 16. what's kept, and for how long

- **Given** a conversation with a message 91 days old and one 89 days old
- **When** the nightly job runs
- **Then** the older one is gone and the newer one stays; and each log line through all of this was a kind, an id or a count, never text

### 17. any messenger

- **Given** an adapter (Telegram, and the fake)
- **When** it sends text, a photo, buttons, or an edit of a sent message
- **Then** the network was asked in that channel's shape; and `supports()` says no for a kind it can't send
- **When** it receives Start with a code, `/stop`, a photo, a button press, or other text, with the right secret
- **Then** the events are *started* with the code, *stopped*, *photo* with a reference, *button* with its value and the message it answers, and *text*; and with a wrong secret it refuses

### 18. any store

- **Given** a store (the fake, and Postgres through the migration)
- **Then** it passes the same tests: conversations by channel and chat, messages in order, statuses forward only, the outbox's lock, cancel by context, and delete on stop

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012). The bot's words are English only for now (ADR 0031).

- Connect the cook's Telegram · The plan goes through Telegram, and what you both send is kept for 90 days. Nothing else leaves your phone. · Connect · Send the link · Waiting for the cook · Connected · Disconnect · That code ran out · Try again
- Sent to the cook, {time} · Goes to the cook at 9 pm · Send again · Changed since you sent it · Couldn't send. Try again. · The cook disconnected. Connect again in Settings.
- The bot: Connected. I'll send you tomorrow's plan each evening. What we send each other is kept for 90 days. Send /stop any time to stop, and it's all deleted. · That code didn't work. Ask for a new one in the app. · Stopped and deleted. Nothing more will come from me. · I can't read replies yet. Tomorrow's plan comes from the app.

## Out of scope

- Acting on what the cook sends back: "Made", "Yes", questions, receipt photos. The next spec, with buttons and the handler.
- Seeing the thread in the planner's app. The rows are kept for it; the screen is a later spec.
- The automatic send when nobody opened the app that evening: needs sync.
- Two planners sending to one cook, and the link outliving the phone: households.
- WhatsApp: a second adapter, costed in ADR 0031.
- The bot in other languages; the cook signing in to the app; mini app buttons.

## Setup

The owner's steps are in [docs/runbooks/telegram.md](../docs/runbooks/telegram.md): the bot and its token are done; the code PR changes step 3 to opening the health page once, and adds running the first migration ([docs/runbooks/database.md](../docs/runbooks/database.md), ADR 0032).
