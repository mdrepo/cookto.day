# #35: Everything works on an iPhone too

- **Issue:** #35
- **Decision:** [ADR 0021](../docs/adr/0021-test-every-engine.md)
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.

## Why

Many people in Dubai and India cook with an iPhone in their hand. Every iPhone browser is Safari's engine, which draws some things its own way. Run on it for the first time, our tests found the language list only 23px tall, too small to tap well, with smaller corners than the design's.

## Acceptance criteria

Each criterion is checked by e2e tests (ADR 0002, 0003).

### 1. every test passes on an iPhone

- **Given** every e2e test of cookto.day and the kit
- **When** they run on an iPhone (WebKit, iPhone 15), as well as the Android phone and the desktop
- **Then** they all pass

### 2. the language list is easy to tap on an iPhone

- **Given** a visitor on an iPhone
- **When** the page loads
- **Then** the language list is at least 44px tall, with the design's corners (8px) and border, and a down arrow (the `chevron-down` icon) at its end, on the left in Arabic, as on every other phone; the look test from #17 checks it

## Words

None.

## Out of scope

- Real iPhones or a device cloud (ADR 0021, Alternatives).
- Firefox.
