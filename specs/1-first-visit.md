# #1: A first visit shows how to start, in the visitor's language

- **Issue:** #1 (the example that starts this repo)
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Someone opening cookto.day for the first time has an empty kitchen in the app. They need to know the one thing to do next, in a language they read, laid out the way that language reads.

## Acceptance criteria

Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. a new visitor sees how to start

- **Given** someone who has never used cookto.day on this browser
- **When** they open it
- **Then** they see the name "cookto.day" and "Add a grocery bill to see what you can cook today"

### 2. switching to Arabic lays the page out right to left

- **Given** a new visitor on the English page
- **When** they choose العربية from the language list
- **Then** the page is in Arabic ("أضف فاتورة بقالة لترى ما يمكنك طبخه اليوم"), and it reads right to left: text starts at the right edge

## Words

- "What to cook today, from what's already in your kitchen"
- "Language"
- "Your kitchen is empty"
- "Add a grocery bill to see what you can cook today"
- "Your bills and pantry stay in this browser. Nothing is uploaded."

In English, Hindi, Marathi and Arabic. Each language's name is shown in its own script in the list.

## Out of scope

Adding a bill (the button and the upload come with their own issue). Remembering the choice is nice to have and is covered by a DOM test, not a criterion.
