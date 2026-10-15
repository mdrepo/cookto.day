# #115: A first visit that makes sense: empty pages say what to do

- **Issue:** #115
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

On a first visit, the Fridge and Dishes are blank pages: no words, nothing to press. Today says "Add a grocery bill", but bills can't be added yet. And after the staples, Today lists what each dish needs, with no way to say "I bought those". Each empty page should say what to do next, with the button to do it.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021).

### 1. an empty Fridge

- **Given** no cuisine loaded
- **When** they open the Fridge
- **Then** it says "Nothing here yet", with "Choose what you cook"
- **Given** North Indian loaded and nothing in the fridge
- **Then** it offers "Add the usual staples" and "Add food"

### 2. empty Dishes

- **Given** no cuisine loaded
- **When** they open Dishes
- **Then** it says "No dishes yet", with "Choose what you cook", which opens it

### 3. Today's words are true

- **Given** an empty kitchen
- **Then** Today says "Choose what you cook, then add what's in your kitchen." and nothing about bills

### 4. staples, but no fresh food

- **Given** North Indian loaded, staples in, and no fresh food
- **When** they open Today
- **Then** it says "No fresh food yet", with "Add what you bought", which opens the Fridge's "Add food"

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Nothing here yet · No dishes yet · Choose what you cook, then add what's in your kitchen. · No fresh food yet · Add what you bought

## Out of scope

- The six-step setup from the prototype.
- Changing onboarding's words about bills ("read the bills your shops send"): bills are the plan, and that step says where they'll come from.
