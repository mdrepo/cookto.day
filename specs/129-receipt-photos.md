# #129: Read a paper receipt from a photo

- **Issue:** #129
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decision:** [ADR 0028](../docs/adr/0028-receipt-photos-ai.md)
- **Where the app lives (25 Oct):** `packages/engine`: `receiptLines()` (each line's food or question, and its amount, from the packs' names and a household's answers); `packages/data`: the receipts client on the network adapter, and the household's answers, one synced record (`receipt-answers`); `packages/usecases`: `readReceiptPhoto()`, `addFromReceipt()` (with Undo), `answerLine()`; `apps/web`: `features/receipt/` (the screen: asking first, reading, "Found in your receipt", what stopped it), "Add a receipt" on Today and "Photo of a receipt" in the Fridge's "Add food", the photo made small in `apps/web/src/photo.ts`.

## Why

Market and corner-shop receipts come on paper. Typing them in is the chore that makes people stop. A photo, read by Gemini Flash-Lite through our own API, fills the Fridge in seconds. Each read costs us money, so the API must refuse anything that isn't a signed-in family's receipt, and never more than the limits.

## API guard rails

Built first, with the API's own tests ([ADR 0025](../docs/adr/0025-server.md)); the AI and sign-in are faked at their edges. Each rule becomes one test.

### 1. off until switched on

- **Given** `RECEIPT_PHOTOS` isn't `on`, or no Gemini key is set
- **When** anyone sends a photo
- **Then** the API answers 503 and calls nothing

### 2. only our page, only signed in

- **When** a photo comes from another site, or from someone signed out
- **Then** the API answers 403 or 401, and counts nothing

### 3. one small photo, and nothing else

- **When** the body is over 1.5 MB, or isn't a JPEG or WebP by its first bytes, whatever its label says
- **Then** the API answers 413 or 415, and counts nothing
- **And** the AI only ever receives our fixed instruction and the photo

### 4. limits, counted before the AI is called

- **Given** a household has read 3 receipts today
- **When** it sends a fourth
- **Then** the API answers 429, says the daily household limit, and when it resets (midnight UTC)
- **And** the same holds for 30 a month per household, 20 a day per network address, and 2,000 a day for everyone

### 5. a failed read is given back

- **When** the AI fails or times out
- **Then** the API answers 502, and that call no longer counts toward any limit

### 6. only checked item lines come back

- **When** the AI answers
- **Then** the API returns only the shop, the date and up to 80 lines, each with its name, quantity, price and amount
- **And** a line whose quantity × price isn't its amount is marked "check"
- **And** a line that makes no sense (a missing or impossible number) is left out, and the rest come back
- **And** prices read the same in every country we serve: `S$`, `$`, `₹`, `Rs`, `AED` and `Dhs` before a number are ignored
- **And** an answer with no lines is 422, "not a receipt", and still counts

### 7. nothing kept

- **When** any photo is read
- **Then** the log line holds the outcome, the time, the line count and the tokens, and nothing from the photo, the address or the account

### 8. signs of abuse end the day

- **When** the AI's answer is cut off at the length limit, isn't JSON, has a line over 120 characters, or has a name with a link, an email address, a phone number or a card number
- **Then** the API answers 422, "rejected", and returns none of it
- **And** that household can't read another receipt until midnight UTC
- **And** the log line says which sign it was
- **And** "not a receipt", or a line that only makes no sense, is no such sign: a blurry photo or an odd receipt is honest
- **And** a bare long number in a name is no such sign either: Indian and Gulf receipts print a 12 or 13-digit barcode or item code on the item's line. A number counts as a phone only when it starts with `+` or follows a word like call, tel, phone, WhatsApp, SMS or hotline. It counts as a card number when it has 15 or 16 digits, alone or in groups of four
- **And** links count in any country: `.in` and `.ae` as well as `.com`, `.net`, `.org`, `.io` and `.sg`

## The app (decided 25 Oct)

The API half shipped on 16 Oct. The owner asked for the app half on 25 Oct, with adding a receipt from the home page. "Found in your receipt" was to come from the PDF spec ([#127](127-receipt-pdf.md)), which isn't built, so it's decided here and #127 later only adds reading PDFs into it.

- **"Add a receipt" is on Today,** for the planner and the cook, below the household line; and "Photo of a receipt" is in the Fridge's "Add food", beside typing and tapping. Both open the phone's camera or photos.
- **The photo is made small on the phone** before it's sent: its longest side at most 1,600 pixels, as JPEG, under 1.5 MB. It's never saved on the phone or the server.
- **Asked once per phone** (criterion 9), remembered on that phone.
- **"Found in your receipt" lists every line the API sent back**, in two groups:
  - **Found:** lines that name one of the loaded cuisines' foods (specs/148's names), ticked, each with the food's name and an amount worked out from the line: a size in the name times the quantity ("Paneer 200G", 4 bought: 800 g), a quantity sold by weight (0.912 kg: 912 g), or a count (15 eggs: 15). With no amount it says "have it". A line the API marked "check" says "Check this line".
  - **Not sure:** lines that name no food, or a word that could be two foods. A word that could be two offers those foods; every line offers "Add as it is" and "Skip". A line with no answer is left out.
- **Answers are remembered for the household:** a line added as it is, or skipped, or matched to a food, is answered the same way on the next receipt and isn't asked again (#127, criterion 4). The answers are one synced record, so every phone in the household knows them.
- **"Add {n}"** adds what's ticked and answered: fresh food bought on the receipt's date (today when it has none, or when it's in the future), staples as in the kitchen, and anything on the shopping list that was bought comes off it. "Undo" puts the Fridge back as it was (as specs/116).
- **Reading stays off until the owner turns it on** (`RECEIPT_PHOTOS`, the runbook's step 4, after its step 3 check with real receipts). Until then the button is there and says "Receipt photos aren't working right now".
- **The privacy line changes now,** whether photos are on or not: it's true either way, since a photo is only ever sent when someone chooses to.

## Acceptance criteria (the app)

Each becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), with the API faked in the browser, and a made-up receipt (never a real one).

### 9. ask before the first photo

- **Given** they're signed in, and have never sent a receipt photo
- **When** they press "Add a receipt" on Today (or "Add food", then "Photo of a receipt", on the Fridge) and choose a photo
- **Then** they read that the photo goes to Google's Gemini to be read, that Google keeps it for a short time only to check for abuse and never trains on it, and that cookto.day keeps only the items
- **And** nothing is sent until they press "Read it"; the next photo isn't asked about

### 10. found in your photo

- **Given** North Indian loaded, and a receipt whose lines are "Fresh Paneer 200G" (4), "Red Onions 700G", "15 Eggs", "Local Tomatoes", "Loose Ginger" (0.15 kg, marked "check") and "Velvet Almond Milk Drink"
- **When** it's read
- **Then** "Found in your receipt" shows, ticked: paneer 800 g, onion 700 g, egg 15, tomato "have it", and ginger 150 g with "Check this line"
- **And** "Not sure" shows the almond milk with "Add as it is" and "Skip"

### 11. add what was bought

- **Given** that receipt, dated yesterday, with paneer on the shopping list
- **When** they add the almond milk as it is and press "Add 6"
- **Then** the Fridge has the five foods bought yesterday, and the almond milk under its own name; paneer is off the shopping list
- **When** they press "Undo"
- **Then** the Fridge and the list are as they were

### 12. ask only once

- **Given** they added "Velvet Almond Milk Drink" as it is, and skipped "Coca-Cola Zero Sugar", on an earlier receipt
- **When** a receipt with the same two lines is read
- **Then** the almond milk is ticked under its own name, the Coke isn't shown, and nothing is under "Not sure"

### 13. what stops a read, in plain words

- **When** they're signed out: "Sign in to read receipt photos"
- **When** they've reached a limit: "You've read 3 receipts today. Try again tomorrow."
- **When** the photo isn't a receipt: "This doesn't look like a receipt"
- **When** the answer was rejected: "We couldn't read this photo. Try again tomorrow."
- **When** reading is off, offline, or failed: "Receipt photos aren't working right now"
- **Then** each offers "Tap what you bought" instead

### 14. the privacy line stays true

- **When** they open Today
- **Then** its privacy line no longer says "Nothing is uploaded". It says: "Your fridge and family stay in this browser. A receipt photo is sent to be read only when you choose, and isn't kept."

## Words

In English, Hindi, Marathi and Arabic (ADR 0012):

- Add a receipt · Photo of a receipt · Read it · Found in your receipt · Not sure · Add as it is · Skip · have it · Check this line · Add {n} · Sign in to read receipt photos · You've read {n} receipts today. Try again tomorrow. · You've read {n} receipts this month. · This doesn't look like a receipt · We couldn't read this photo. Try again tomorrow. · Receipt photos aren't working right now · Tap what you bought
- The consent text in criterion 9
- The privacy line in criterion 14

## Out of scope

- Reading on the phone without the network (free OCR): a later fallback (ADR 0028).
- Several photos for one long receipt.
- Prices and spending.
