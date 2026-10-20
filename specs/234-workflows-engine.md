# #234: The workflows engine, with no new behaviour

- **Issue:** #234
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** as [ADR 0034](../docs/adr/0034-workflows-and-templates.md) says. `packages/workflows` (new): `workflow()`, the runner, the build check of keys and template ids. `packages/templates` (new): `en.ts`, the template check, `render()` with the app's word format. `db/migrations/0007_runs`: `runs`, its functions (claim, commit, due, expire), and two switches. `apps/api`: the action registry (empty but for `passOn`), the router in the order the ADR gives, the cron starting due runs, and today's bot replies moved onto templates. No app change.

## Why

ADR 0034 decided the engine every conversation will run on. This spec builds it alone first, with nothing a person would notice, so the backbone is proven by its tests before the planner's and helper's workflows are built on it.

## Decisions

- **Today's replies become templates**, word for word: connected, that code didn't work, stopped, I can't read replies yet, signed in, you're in, you've been removed. They are sent the same way, so nobody sees a change.
- **One test workflow ships only in the tests**, `test_ping`: a button step, a text step and an expiry, to exercise every path.
- **The two switches**: `BOT_OFF` (a Worker setting, everyone) and `bot_off` on the household (set by a database function; the app's control comes with the first workflow spec). With either on, no run starts and no run's message is queued; the bot's replies to commands still go.
- **"That's done already"** is the one new template; it is only ever sent to a button from a run that has moved on, which can't happen until the first real workflow.

## Acceptance criteria

Unit tests in `packages/workflows/test` and `packages/templates/test` (pure), `apps/api/test` (the router and actions, with the fake messenger and stores), and `db/test` on Postgres for runs.

### 1. a workflow, as a script

- **Given** `test_ping`
- **When** the events are: start, the button `yes`, the text "hello"
- **Then** the runner returns, in turn: the template `ping_ask` with keys `yes` and `no`; the action `passOn` with no message; the end, and nothing else

### 2. the build check

- **When** a workflow names a template that doesn't exist, a button key its template lacks, or a step that isn't defined
- **Then** the check fails and names the workflow, the step and what's missing

### 3. the template check

- **When** a template's slots or button keys differ between languages, a button label is over 20 characters, a body is over 1,024, a buttons template has more than 3 or a choices template more than 10
- **Then** the check fails and names the template and the rule

### 4. rendering

- **When** a template is rendered with its slots, in a language that has it, and in one that doesn't
- **Then** the words are the language's, with plurals in the language's forms; the missing one is English

### 5. claim, act, commit

- **Given** a run waiting at a step
- **When** two button presses for that step arrive together
- **Then** one claims it and acts; the other acts on nothing and gets "That's done already"; the run moved once and its messages were queued once
- **When** a claim's lease runs out before its commit
- **Then** the next attempt claims again, runs the same actions again without changing anything twice, and commits

### 6. stale and forged buttons

- **When** a button names a run that's done, a step the run isn't at, a run of another household, or isn't a run's button at all
- **Then** nothing changes; a run's button gets "That's done already"

### 7. the router's order

- **Given** a member with a run waiting for text
- **When** she sends /help, then a button for another run, then text, then a photo
- **Then** /help is answered and the run is still waiting; the button goes to its run; the text goes to the waiting step; the photo, which the step doesn't accept, is passed to the planner (receipts come with their spec)

### 8. due runs, and the floor

- **Given** a run due now, and its member holding the floor with another run waiting for text
- **When** the cron runs
- **Then** the due run waits; when the other run ends, the next cron starts it

### 9. expiry

- **Given** a waiting run that has expired
- **When** the cron runs
- **Then** its expiry action runs once, and it's marked expired

### 10. the switches

- **When** `BOT_OFF` is set, or the household's `bot_off` is on
- **Then** due runs don't start and no run's message is queued; /stop and the sign-in replies still work; when it's off again, the runs carry on

### 11. today's replies, unchanged

- **Then** every reply of [spec #207](207-connect-the-cook.md), [#216](216-sign-in-telegram.md) and [#217](217-households.md) is sent with the same words as before, now from its template; the existing tests pass untouched

### 12. runs on Postgres

- **Given** the migration applied
- **Then** a store contract passes on the fake and on Postgres: create, claim once, commit, due by time, expire, delete with the household, and everything gone on the way down

## Words

The bot, English only (ADR 0031): That's done already.

## Out of scope

- Every real workflow: the planner's yes or no and the helper's plan, the meal checks, receipts. A spec each.
- The server picking tomorrow's plan, and its timing test: with the planner's workflow.
- The app's control for "bot off", languages per member, and the chart drawn from the definitions.
