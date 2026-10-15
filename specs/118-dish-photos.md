# #118: Dish photos, free licence, loaded lazily

- **Issue:** #118
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decision:** the photos come from Wikimedia Commons under free licences, with credit. Mayur approved this on 16 Oct.

## Why

A dish name is easy to skip. A photo makes you hungry, and it tells you what the dish is when you don't know its name. Photos are heavy, though, and the app must stay fast on mobile data.

## Where the photos come from

- **Wikimedia Commons,** usually the photo on the dish's Wikipedia page.
- **Only these licences:** public domain, CC0, CC BY and CC BY-SA. Each photo keeps its own licence. The app shows the credit, and the photo's file keeps it too.
- **Claude checks each photo is the right dish,** by looking at it. Wikipedia's "Saag aloo" page shows sarson ka saag, for example. Mayur asked not to be part of this check (16 Oct).
- **We host them ourselves,** shrunk to WebP, so nothing loads from other sites ([ADR 0013](../docs/adr/0013-static-browser-only.md)).
- A dish with no good free photo has none, for now.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), unless it says otherwise.

### 1. a dish's page has its photo

- **Given** Palak paneer has a photo
- **When** they open its page
- **Then** the photo is at the top, described as "Palak paneer" for screen readers
- **And** under it: "Photo: <author>, CC BY-SA 4.0", linking to the photo's Commons page

### 2. Dishes shows small photos, and loads only what you see

- **When** they open Dishes
- **Then** each row has a small photo beside the dish's name
- **And** photos far below the screen aren't downloaded until they scroll near them

### 3. nothing jumps

- **When** a photo arrives
- **Then** nothing on the page moves: its space was kept from the start

### 4. a dish without a photo

- **Given** a dish with no photo
- **Then** it shows a plain tile, the same size, with the pot drawing

### 5. the first visit stays light (a check, not e2e)

- **Given** the site's page-size budget test
- **Then** a first visit's scripts and styles are unchanged, and no photo loads before Today's first draw
- **And** each photo is at most 40 KB (the small one at most 8 KB)

### 6. every photo is credited (a check, not e2e)

- **Given** a pack photo without an author, a licence, or its Commons page, or with a licence not on the list
- **Then** `packs:check` fails, saying which photo and how to fix it

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Photo: {author}, {licence}

## Out of scope

- Our own photos (a family's own photo of their dish).
- AI-made pictures: they'd show food that was never cooked.
- Photos on Today's cards and in the Fridge: after we see how they look on Dishes and the dish page.
