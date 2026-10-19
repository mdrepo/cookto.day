# #202: Does each saved key work? The API asks the service, and never shows the value

- **Issue:** #202
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Where it lives:** `apps/api`: `keys.ts` (`keysChecker()`), one route in `router.ts` (`GET /api/health/keys`), wired in `index.ts`. No change to the app people open.

## Why

The owner saved the Telegram token, the Supabase URL and key, and the Gemini key as Worker secrets (#198). Cloudflare keeps secrets write-only, so nothing outside the Worker can tell whether a value was pasted right. A wrong one would only show up when the bot, sign-in or receipt photos ship, weeks later, as a mystery failure.

## Decisions

- **The Worker asks each service a question that costs nothing:** Telegram `getMe`, Supabase `/auth/v1/health` with the anon key, Gemini's models list with the key. Each call has a 5-second limit.
- **States, never values.** Each key answers `ok`, `rejected` (the service refused the value), `missing` (not saved) or `unreachable` (the service didn't answer in time). Telegram adds the bot's username when the token is good, which is public anyway.
- **Kept a minute.** The Worker remembers the answer for 60 seconds per instance, so the endpoint can't be used to hammer the three services.
- **Public, like `/api/health`.** It reveals which services we use, which the public repo already does.
- **Network access stays in one file.** The API's lint allows `fetch` only in the Gemini adapter (ADR 0028). That file exports its one-line network wrapper and the check borrows it; the rule and its file don't change. The Telegram bot's spec will propose a proper home for outgoing calls.

## Acceptance criteria

The API has no screen, so each criterion is a unit test in `apps/api/test` with a faked network (ADR 0025), not an e2e test.

### 1. every key good: ok, and the bot's name

- **Given** all four values saved, and each service answering 200
- **When** `GET /api/health/keys`
- **Then** `telegram` is `ok` with `bot: "cooktoday_bot"`, `supabase` is `ok`, `gemini` is `ok`; and the three hosts asked are Telegram's, the project's Supabase and Google's

### 2. the keys travel the way each service expects, and never in the answer

- **Given** the same
- **When** the check runs
- **Then** the token is in Telegram's URL, the anon key in Supabase's `apikey` header, the Gemini key in `x-goog-api-key`; and none of the four values appears anywhere in the answer

### 3. a service that says no: rejected; one that's down: unreachable

- **Given** Telegram answering 401, Supabase refusing the connection, Gemini answering 400
- **When** the check runs
- **Then** `telegram` is `rejected`, `supabase` is `unreachable`, `gemini` is `rejected`

### 4. a key not saved yet is missing, and the service isn't asked

- **Given** no Telegram token and no Supabase key saved
- **When** the check runs
- **Then** `telegram` and `supabase` are `missing`, `gemini` is `ok`, and only Google was asked

### 5. the answer is kept for a minute

- **Given** a check that ran at 0 s
- **When** it runs again at 59 s, then at 60 s
- **Then** the services were asked once in the first minute, and again after it

### 6. the route

- **Given** the Worker
- **When** `GET /api/health/keys`
- **Then** 200 with the report, `cache-control: no-store`, like every other answer

## Words

None.

## Out of scope

- Telling Telegram where to send updates (`setWebhook`): the bot's spec.
- Checking `TELEGRAM_WEBHOOK_SECRET`: it's ours, there is no service to ask.
- Any screen for this in the app.
