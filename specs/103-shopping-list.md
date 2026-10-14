# #103: A shopping list from what dishes need

- **Issue:** #103
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

A dish's page says what you need, but then nothing happens. Families shop from a list: one person writes it, another buys it, often from a WhatsApp message. The app should turn "You need" into that list, and turn what was bought into the fridge.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. add what a dish needs

- **Given** Palak paneer needs cream, onion and tomato
- **When** they press "Add to my list" on its page
- **Then** it says "Added 3 to your list", and the list has cream, onion and tomato
- **And** adding a dish that needs onion again doesn't list onion twice

### 2. the list, beside the fridge

- **When** they open the Fridge
- **Then** "Shopping list (3)" is at the top, and opens the list
- **And** with nothing on it, the Fridge doesn't show it

### 3. tick it off, and it's in the fridge

- **Given** cream, onion and tomato on the list
- **When** they tick onion
- **Then** onion leaves the list and is in the fridge, bought today
- **And** the list is kept after a reload

### 4. add anything

- **When** they type "Bread" and press Add on the list
- **Then** Bread is on the list, as typed

### 5. send it

- **When** they press "Send the list"
- **Then** the phone's share sheet opens with the list as text, one item a line, so they can send it on WhatsApp or anywhere
- **And** where there's no share sheet (most laptops), the list is copied, and it says "Copied"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Add to my list · Added {n} to your list · Shopping list · Shopping list ({n}) · Add · Send the list · Copied · Nothing on your list

## Out of scope

- Amounts on the list ("500 g onion"): names first.
- Sharing a live list between phones (sync, ADR 0025): the list is sent as text.
- Prices and shops.
