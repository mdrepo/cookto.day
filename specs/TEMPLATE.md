# #<issue>: <one-line summary in the user's words>

- **Issue:** #<issue>
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** <the package and function each rule goes in, e.g. `packages/engine`: `cookToday()`. The owner checks this line when approving (ADR 0029).>

## Why

<What problem does the household have? One or two sentences.>

## Acceptance criteria

Each criterion becomes one e2e test, named after it (ADR 0002, 0003).

### 1. <criterion name, e.g. "spinach bought 4 days ago is suggested first">

- **Given** <starting state, e.g. spinach bought 4 days ago, which keeps 5 days, and paneer bought yesterday>
- **When** <what the person does>
- **Then** <what they see>

### 2. <...>

- **Given** ...
- **When** ...
- **Then** ...

## Words

<New text people will see, in English. Hindi, Marathi and Arabic are part of the change (ADR 0012). "None" is a fine answer.>

## Out of scope

<What this change deliberately does not do.>
