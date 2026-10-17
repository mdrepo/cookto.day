# #129: Read a paper receipt from a photo

- **Issue:** #129
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decision:** [ADR 0028](../docs/adr/0028-receipt-photos-ai.md)

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

## Acceptance criteria (the app)

Built after sign-in ships. Each becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), with the API faked in the browser.

### 9. ask before the first photo

- **Given** they're signed in, and have never sent a receipt photo
- **When** they press "Add food", then "Photo of a receipt"
- **Then** they read that the photo goes to Google's Gemini to be read, that Google keeps it for a short time only to check for abuse and never trains on it, and that cookto.day keeps only the items
- **And** nothing is sent until they press "Read it"

### 10. found in your photo

- **When** they take a photo of a receipt
- **Then** they see "Found in your receipt", as for a PDF (specs/127, criteria 1 to 5), and lines marked "check" say "Check this line"

### 11. what stops a read, in plain words

- **When** they're signed out: "Sign in to read receipt photos"
- **When** they've reached a limit: "You've read 3 receipts today. Try again tomorrow."
- **When** the photo isn't a receipt: "This doesn't look like a receipt"
- **When** the answer was rejected: "We couldn't read this photo. Try again tomorrow."
- **When** reading is off, offline, or failed: "Receipt photos aren't working right now"
- **Then** each offers "Tap what you bought" instead

### 12. the privacy line stays true

- **Given** receipt photos are on
- **When** they open Today
- **Then** its privacy line no longer says "Nothing is uploaded". It says: "Your fridge and family stay in this browser. A receipt photo is sent to be read only when you choose, and isn't kept."
- **And** while photos are off, the line stays as it is today

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Photo of a receipt · Read it · Check this line · Sign in to read receipt photos · You've read {n} receipts today. Try again tomorrow. · You've read {n} receipts this month. · This doesn't look like a receipt · We couldn't read this photo. Try again tomorrow. · Receipt photos aren't working right now
- The consent text in criterion 9
- The privacy line in criterion 12

## Out of scope

- Reading on the phone without the network (free OCR): a later fallback (ADR 0028).
- Several photos for one long receipt.
- Prices and spending.
