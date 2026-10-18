# #146: Feedback from the kitchen, every day

- **Issue:** #146
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Needs:** sign-in (#150), so only a household can write its own notes.

## Why

The owner cooks with the app every day and notices things: "too salty", "the child didn't eat this", "palak goes off faster than this". Today those thoughts are lost. The owner wants a daily loop: write a line where it happened, and the next morning it's turned into a fix, a recipe change or a question.

## Decisions

- **A "Feedback" button on every dish and every screen.** One line of text. The note remembers where it was written: the screen, and the dish if there is one.
- **Notes go to a private store on our server,** in the household's own rows (ADR 0025's row-level security). No one else can read them.
- **Fetched, then deleted.** Each morning the owner's agent reads the new notes through the API with the owner's key, and the server deletes them once they're read. Nothing is kept longer than a day after reading.
- **What happened to each note shows in the app:** "Fixed", "Changed the recipe", or a question back, in a "Your notes" list in Settings.
- **Signed out, the button still works:** the note waits on the phone and is sent after sign-in.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), with the API faked in the browser; the API rules get the API's own tests.

### 1. write a note where it happened

- **Given** they're on Palak paneer's page
- **When** they press "Feedback", type "Too salty for us", and press "Send"
- **Then** they see "Thanks. We'll read it tomorrow morning."
- **And** the note sent says the dish was Palak paneer

### 2. only the household's own notes

- **When** someone sends a note while signed out, or for another household
- **Then** the API answers 401 or 403, and keeps nothing

### 3. fetched, then gone

- **Given** three new notes
- **When** the owner's agent fetches them
- **Then** it gets all three, and a second fetch gets none

### 4. what happened to it

- **Given** a note answered "Changed the recipe: less salt"
- **When** they open "Your notes" in Settings
- **Then** they see their note and that answer

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Feedback · What's on your mind? · Send · Thanks. We'll read it tomorrow morning. · Your notes · Fixed · Changed the recipe · Waiting

## Out of scope

- Photos with a note.
- Notes from people outside the household.
- The agent's morning routine itself: a runbook, not app code.
