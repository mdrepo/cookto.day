# #104: We cooked this: Today doesn't repeat it

- **Issue:** #104
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Today suggests from what's in the kitchen, so it can suggest yesterday's dinner again. Families get bored fast. If they can say "we cooked this" in one tap, the app can keep the next few days different, without asking anything else.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. say it, in one tap

- **Given** lunch's pick on Today is Palak paneer
- **When** they press "We cooked this" on it
- **Then** the card says "Cooked today", and the button is gone
- **And** a dish's page has the same button, and says "Cooked today" once pressed

### 2. the next days are different

- **Given** Palak paneer cooked today
- **When** they open Today tomorrow, or the day after
- **Then** no meal's pick is Palak paneer (it can still be one of the "Other ideas", last)
- **When** they open Today three days later
- **Then** it can be picked again

### 3. it's remembered

- **Given** Palak paneer cooked today
- **When** they reload
- **Then** lunch's card still says "Cooked today"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- We cooked this · Cooked today

## Out of scope

- Taking the dish's amounts out of the fridge: that needs amounts the household trusts.
- A history page, ratings, favourites.
- How many days to keep it different: two, for now.
