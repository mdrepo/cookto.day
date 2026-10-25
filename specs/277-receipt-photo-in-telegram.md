# #277: Add a receipt from the bot: send a photo of the bill in Telegram

- **Issue:** #277
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged. It brings [#129](129-receipt-photos.md)'s receipt photos into the chat, under [ADR 0028](../docs/adr/0028-receipt-photos-ai.md)'s limits.
- **Where it lives:**
  - `packages/messenger`: the photo event carries the largest size Telegram has that's at most 1.5 MB; a file (a document) sent to the bot is an event of its own; the channel fetches a photo by its reference (Telegram's `getFile`), held in memory only.
  - `apps/api/src/receipts/read.ts`: the five layers split, so the bot reads through the same switch, photo check, limits, strikes and answer check as `POST /api/receipts/read`, with the member's household in place of the session and their Telegram account in place of the network address.
  - `packages/usecases`: `receiptRows()` and `addFromReceipt()` / `undoReceipt()`, as the app uses them, run on the household's records (`householdStore`).
  - `packages/workflows`: `receipt` (ask once, read, found, add, Undo) and `receipt_line` (one line it isn't sure of).
  - `packages/templates`: every message below, and the menu's `/receipt`.
  - `apps/api/src/messenger`: `/receipt` for planners and the cook; a photo no question is waiting for goes to `receipt`.

## Why

Groceries arrive with a paper bill, and whoever unpacks them has Telegram open, not the app. Sending a photo to the bot should fill the household's Fridge in a few seconds, with one tap, so the plan and the shopping list keep up with what's really in the kitchen.

## Decisions

- **Who:** every member with a chat, planners and the cook. Someone with no household gets the welcome, as any command does; with the bot off, "I'm switched off for now."
- **Photos only.** A PDF or any other file gets "I can read photos of bills for now. Send it as a photo." PDF bills come in [#278](https://github.com/mdrepo/cookto.day/issues/278), after ADR 0025 changes.
- **Asked once per person, in the chat,** before their first photo goes to Google. Agreeing is remembered for that member (a finished run, as the plan's are), not per phone.
- **Nothing kept.** The photo is fetched from Telegram when it's read and never stored or logged. While the bot asks first, the run holds only Telegram's reference to it. The log line is #129's rule 7, with the route.
- **The same limits, counted together.** A receipt read in the chat counts toward the household's 3 a day and 30 a month, as one read in the app does. The Telegram account takes the network address's place (20 a day), and everyone's 2,000 a day is shared. #129's rule 8 holds: a sign of abuse ends the household's day.
- **What's found is added for the household,** bought on the receipt's date (today when it has none, or when it's in the future), as the app's "Add {n}" does: staples as in the kitchen, and anything bought comes off the shopping list. The household's phones get it at their next sync.
- **Lines it isn't sure of** are asked one at a time, after the found ones are added, each with **[Add as it is] [Skip]**, or a food's name when the word could be two foods. Answers are the household's (`receipt-answers`), so a line is asked once, in the chat or the app.
- **Off until the owner turns it on.** Until `RECEIPT_PHOTOS` is on (the runbook's step 3, then 4), a photo gets "Receipt photos aren't working right now."

## Acceptance criteria

Criteria 1 to 9 are the API's own tests (`apps/api/test/`, Telegram and Gemini faked at their edges, a made-up receipt, never a real one). Criterion 10 is an e2e test.

### 1. /receipt asks for the photo

- **Given** Mayur plans and Sunita cooks, both with a chat
- **When** either types "/"
- **Then** the menu has `/receipt`, "Add a receipt"
- **When** Mayur sends /receipt
- **Then** the bot says "Send me a photo of the bill."

### 2. asked once, before the first photo

- **Given** Sunita has never sent a receipt photo
- **When** she sends a photo
- **Then** the bot says "Before I read it: the photo goes to Google's Gemini to be read." / "Google keeps it a short while only to check for abuse, and never trains on it." / "cookto.day keeps only the items." with **[Read it] [Don't]**
- **And** nothing is sent to Gemini until she presses "Read it"
- **When** she presses "Don't"
- **Then** the bot says "Okay, I won't read it." and nothing is counted
- **When** she sends another photo after agreeing once
- **Then** it's read without asking

### 3. what was found

- **Given** North Indian loaded, and a receipt from Fresh Mart dated yesterday whose lines are "Fresh Paneer 200G" (4), "Red Onions 700G", "15 Eggs", "Local Tomatoes", "Loose Ginger" (0.15 kg, marked "check") and "Velvet Almond Milk Drink"
- **When** Mayur sends its photo
- **Then** the bot says "Fresh Mart, yesterday: 6 lines." / "Found: paneer 800 g, onion 700 g, egg 15, tomato, ginger 150 g (check this line)." / "Not sure: Velvet Almond Milk Drink." with **[Add 5] [Don't add]**

### 4. adding, for the household

- **Given** that receipt, with paneer on the shopping list
- **When** Mayur presses "Add 5"
- **Then** the household's Fridge has paneer, onion, egg, tomato and ginger, bought yesterday, with those amounts, and paneer is off the list
- **And** the bot says "Added 5 to the Fridge. Paneer is off the list." with **[Undo]**
- **And** then asks "Add Velvet Almond Milk Drink as it is?" with **[Add as it is] [Skip]**
- **When** he presses "Add as it is"
- **Then** it's in the Fridge under its own name, and the bot says "Added Velvet Almond Milk Drink."

### 5. Undo

- **When** Mayur presses "Undo" under "Added 5 to the Fridge."
- **Then** the five foods are gone, paneer is back on the list, and the bot says "Taken back."
- **And** a second press says "That's done already."

### 6. a line is asked once

- **Given** "Velvet Almond Milk Drink" was added as it is, and "Coca-Cola Zero Sugar" skipped, on an earlier receipt (in the chat or the app)
- **When** a receipt with both lines is read in the chat
- **Then** the almond milk is among the found lines under its own name, the Coke isn't mentioned, and nothing is asked

### 7. what stops a read, in plain words

- **When** the household has read 3 receipts today, in the app or the chat: "You've read 3 receipts today. Try again tomorrow."
- **When** it has read 30 this month: "You've read 30 receipts this month."
- **When** the photo isn't a receipt: "This doesn't look like a receipt."
- **When** the answer was rejected: "I couldn't read this photo. Try again tomorrow."
- **When** reading is off, or Telegram or Gemini fails: "Receipt photos aren't working right now."
- **And** a failed read isn't counted, as in #129's rule 5

### 8. only a small photo reaches Gemini

- **Given** Telegram offers a photo in several sizes
- **When** it's read
- **Then** the bot fetches the largest that's at most 1.5 MB, and Gemini gets only our fixed instruction and that photo
- **When** every size is over 1.5 MB, or the file isn't a JPEG or WebP by its first bytes
- **Then** "Receipt photos aren't working right now.", and nothing is counted

### 9. a question waiting for a photo comes first; files are refused

- **Given** a run is waiting for the member's photo
- **When** they send one
- **Then** it goes to that run, not to a receipt
- **When** they send a PDF or any other file
- **Then** the bot says "I can read photos of bills for now. Send it as a photo."

### 10. the phone sees what the chat added

- **Given** Mayur is signed in on his phone, and Sunita adds a receipt's 5 found lines in the chat
- **When** Mayur's phone syncs
- **Then** his Fridge shows paneer, onion, egg, tomato and ginger, bought yesterday

## Words

The bot speaks English for now (as in [#270](270-the-bot-talks-like-a-person.md)); no app words change.

- Add a receipt · Send me a photo of the bill.
- Before I read it: the photo goes to Google's Gemini to be read. · Google keeps it a short while only to check for abuse, and never trains on it. · cookto.day keeps only the items. · Read it · Don't · Okay, I won't read it.
- {Shop}, {day}: {n} lines. · Found: {items}. · Not sure: {names}. · (check this line) · Add {n} · Don't add
- Added {n} to the Fridge. · {Food} is off the list. · Undo · Taken back.
- Add {name} as it is? · Add as it is · Skip · Added {name}.
- You've read {n} receipts today. Try again tomorrow. · You've read {n} receipts this month. · This doesn't look like a receipt. · I couldn't read this photo. Try again tomorrow. · Receipt photos aren't working right now.
- I can read photos of bills for now. Send it as a photo.

## Out of scope

- PDF bills in the chat: [#278](https://github.com/mdrepo/cookto.day/issues/278).
- Several photos for one long receipt.
- Telling the other members a receipt was added.
- Prices and spending.
