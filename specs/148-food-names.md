# #148: Food by the names people use

- **Issue:** #148
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Changes:** [ADR 0027](../docs/adr/0027-pantry-and-cuisine-packs.md): ingredients move out of each pack into one shared folder. The ADR gets a note in the same PR as the code.

## Why

The owner's receipt says PALAK, LADIES FINGER, BIG ONION, BRINJAL and CHILLI PADI. The app knows spinach, okra, onion, eggplant and green chilli, so those lines never reach the Fridge. And a Marathi family says palak, not spinach. One food has many names, by language, by region and by shop. The app should honour all of them, and keep them in one place.

## Decisions

- **One food, one record, many names.** Spinach stays one ingredient. It carries a list of names, each tagged:
  - **language:** en, hi, mr, ar
  - **region:** IN, SG, AE, or none
  - **script:** Latin, Devanagari, Arabic
  - **source:** a dictionary (Wikidata), a receipt, or a person
  - e.g. spinach: `spinach` (en) · `palak` (hi, mr, Latin) · `पालक` (hi, mr) · `PALAK` (SG, receipt) · `BAYAM` (SG, receipt) · `سبانخ` (ar)
- **Ingredients live once,** in `packs/ingredients/`, shared by every pack. A pack's dishes refer to them by id. No pack copies a name.
- **The app shows the name in the household's language,** then English. A Marathi household sees "palak".
- **Matching reads every name.** It ignores case, extra spaces, and shop words like BIG, FRESH, LOCAL, PKT, 500G, 1KG, and tries the whole line, then its words.
- **A word that could be two foods asks.** "CHILLI" could be green or red chilli. Such words are marked `"ask": ["green-chilli", "red-chilli"]`, and the app asks once.
- **People teach it.** When a line doesn't match, the person picks the food once. Their phone remembers the word at once. The word also goes to the feedback store (#146), and the owner's agent adds it to the shared list after a look, marked `source: person`, so every family gets it.
- **A check guards the list:** `packs:check` fails when one name, after tidying, points to two foods without an `ask`.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), plus unit tests for matching and the check.

### 1. shop words land in the Fridge

- **Given** a receipt with PALAK, LADIES FINGER, BIG ONION, BRINJAL and CHILLI PADI
- **When** they look at "Found in your receipt"
- **Then** the lines read Spinach, Okra, Onion, Eggplant and Green chilli, none unmatched

### 2. the household's own word

- **Given** a household that speaks Marathi
- **Then** the Fridge shows "पालक" for spinach

### 3. a word that could be two foods

- **Given** a receipt line "CHILLI"
- **Then** it asks "Green chilli or red chilli?"
- **When** they pick green chilli
- **Then** the next "CHILLI" is green chilli without asking

### 4. teaching a new word

- **Given** a receipt line "KANGKONG" that matches nothing
- **When** they pick "Water spinach" for it
- **Then** the next receipt's "KANGKONG" is water spinach

### 5. the check

- **Given** a pack where "PEPPER" names both black pepper and capsicum, without `ask`
- **Then** `packs:check` fails and names both foods

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- {food} or {food}? · Which food is "{word}"? · The names themselves, per ingredient

## Out of scope

- Spelling mistakes and OCR typos ("PALAAK"): a fuzzy match comes later, if needed.
- Brands as foods ("AMUL" means butter or milk): left unmatched for now.
