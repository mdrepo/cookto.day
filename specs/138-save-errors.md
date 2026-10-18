# #138: A failed save says so

- **Issue:** #138
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Decision:** [ADR 0024](../docs/adr/0024-data-layer.md): errors are values with a kind, and hooks show them

## Why

Every change on the phone is saved without a word. If saving fails, because the phone is out of space or the browser refuses, the change is quietly lost, and the person thinks it worked. They find out days later, when the Fridge is wrong.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021). The browser's storage is made to fail in the test; nothing of ours is faked.

### 1. the phone is out of space

- **Given** the phone's storage is full
- **When** they add food
- **Then** they see "Couldn't save that. Your phone is out of space.", and screen readers hear it at once
- **And** the food isn't in the Fridge

### 2. any other failure

- **Given** the browser refuses to save, for any other reason
- **When** they mark food used up
- **Then** they see "Couldn't save that. Try again."
- **And** the food is still in the Fridge

### 3. it goes when they've read it

- **Given** "Couldn't save that" showing
- **When** they press "OK", or their next change saves
- **Then** it's gone

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Couldn't save that. Your phone is out of space. · Couldn't save that. Try again. · OK

## Out of scope

- Failed reads: the screens already show what was last read.
- Saving again by itself: the person decides.
- Settings and language, which save to a different store.
