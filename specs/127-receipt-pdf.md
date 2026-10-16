# #127: Read a shop's receipt PDF on the phone

- **Issue:** #127
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Online shops email a PDF receipt with every order. Typing 20 lines into the Fridge is the chore that makes people stop. RedMart's PDF holds real text in a fixed table, so the phone can read it itself: no photo reading, no AI, no server, and nothing uploaded. We add what we recognise and ask the family about the rest.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021). The tests use a made-up RedMart receipt with the same layout, never a real one: real receipts carry a name and a home address.

### 1. found in your receipt

- **Given** North Indian loaded, and an empty fridge
- **When** they press "Add food" on the Fridge, then "Read a receipt", and choose a RedMart PDF
- **Then** they see "Found in your receipt" with each food we know ticked, and its amount worked out from the line:
  - "Fresh Paneer 200G", 4 bought: paneer, 800 g
  - "Red Onions 700G": onion, 700 g
  - "15 Eggs 15 X 60G": egg, 15
  - "Local Tomatoes": tomato, with no amount ("have it")

### 2. a snack isn't poha

- **Given** a receipt with "Patal Poha Chiwada", "Mataki Bhel" and "Fried Battered Chicken Fillets"
- **When** it's read
- **Then** none of them is ticked as poha, puffed rice or chicken; all three are under "Not sure"

### 3. ask about the rest

- **Given** a receipt with lines we don't recognise, such as "Thai Hom Mali Jasmine Rice" and "Coca-Cola Zero Sugar"
- **When** it's read
- **Then** "Not sure" lists each one with three choices: which of our foods it is, "Add as it is", or "Skip"
- **When** they say the rice is Rice, add the Coke as it is, and leave the rest
- **Then** the button counts what's ticked and answered, such as "Add 10", and lines with no answer are left out

### 4. ask only once

- **Given** they said "Thai Hom Mali Jasmine Rice" is Rice on an earlier receipt
- **When** they read a receipt with the same line
- **Then** it's ticked as Rice, not under "Not sure"

### 5. added as bought on delivery day

- **When** they press "Add 10"
- **Then** fresh food is in Fresh, bought on the receipt's delivery date, each with its use-by
- **And** staples on the receipt, such as cumin, count as in the kitchen
- **And** anything on the shopping list that was bought comes off it (as specs/113, criterion 4)
- **And** "Undo" puts the Fridge back as it was (as specs/116)

### 6. a receipt we can't read yet

- **When** they choose a PDF from another shop, a scanned receipt, or a file that isn't a receipt
- **Then** they see "We can't read this receipt yet" and "Tap what you bought" instead, and nothing is added

### 7. nothing is uploaded

- **When** a receipt is read
- **Then** the page makes no network request with it, and the name, address and order numbers are never stored

## How it's built (for reviewers)

- **No new library.** The browser's own `DecompressionStream` unzips the PDF's text, and a small reader picks out the table. A shop that changes its layout fails criterion 6, never with wrong food.
- **One reader per shop**, in its own file with its own test. RedMart is the first; adding a shop means one reader and one made-up receipt.
- **Recognising food** uses words each cuisine pack gives its foods, such as "onion", "onions" and "red onions", plus words that rule a line out, such as "chiwada", "bhel", "fried" and "battered". `packs:check` checks them.
- **New foods in North Indian**, each with its USDA FoodKeeper shelf life, so common receipt lines are recognised: tofu (1 week), coconut (2 to 3 weeks), beetroot (1 to 2 weeks), pumpkin (1 to 3 months), apples (4 to 6 weeks) and guava (2 to 4 days). Rice becomes one staple that any rice counts as.
- **Answers to "Not sure"** are kept in this browser, like the rest of the kitchen.

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Read a receipt · Found in your receipt · Not sure · Which food is this? · Add as it is · Skip · We can't read this receipt yet
- The six new foods' names

## Out of scope

- Sharing the PDF straight from the email app to cookto.day: a later step, once the app installs on phones.
- Shops other than RedMart.
- Paper receipts and photos (proposal #112).
- Forwarding receipts by email (proposal #108).
- Prices and spending.
