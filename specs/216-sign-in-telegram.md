# #216: Sign in with Telegram, one tap through the bot

- **Issue:** #216
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Changes:** [spec #150](150-sign-in-google.md) chose Google. The owner chose Telegram first on 20 Oct 2026 ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)); Google stays a later provider.
- **Where it lives:** `db/migrations/0004_accounts`: `accounts`, `identities`, `sessions`, the `purpose` column on `links`, their functions ([ADR 0032](../docs/adr/0032-sql-migrations.md)); `apps/api/src/auth/`: `Auth` with its first provider, `telegram.ts` (a code's Start becomes an identity), `session.ts` (the cookie, its hash), `routes.ts` (`POST /api/auth/links`, `GET /api/auth/links/{code}`, `DELETE /api/auth/session`, `GET /api/auth/me`); the messenger's webhook handler, which answers Start differently for a sign-in code; `packages/data`: `settings.signedIn` (the first name, per phone, never a token) and the network adapter's `credentials: "include"`; `packages/usecases`: `signIn()`, `signOut()`; `apps/web`: `features/settings/SignIn` (above Who cooks).

## Why

The plan should be the same on every phone in the family, and the bot should be able to act on what the cook says. Both need to know whose plan it is ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)). The family already has Telegram, so signing in is the same tap the cook makes: a code, Start.

## Decisions

- **"Continue with Telegram" is in Settings, at the top, on any phone.** One line first: "We keep your Telegram name and id, and your kitchen, so every phone in your family sees one plan. Nothing else." Then "Continue".
- **A code and a link, as the cook's.** The phone asks the API for a sign-in link. It shows the code (`KM7Q-4HTX`, the same alphabet as [spec #207](207-connect-the-cook.md)), "Open Telegram" (the link `https://t.me/cookto_day_bot?start=KM7Q4HTX`), and "Waiting for Telegram". The code lasts ten minutes and works once.
- **Start with a sign-in code makes or finds the account,** by Telegram's user id, and marks the link used. The bot answers "Signed in. Go back to the app." A used, old or unknown code gets "That code didn't work. Ask for a new one in the app."
- **The phone polls every 3 seconds with the link's token.** When the link is used, the answer sets the session cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, 30 days from last use) and says the first name. The phone keeps the name only. Settings shows "Signed in as {name}" and "Sign out".
- **Signing in doesn't change the kitchen on this phone.** What happens to the kitchen is [spec #217](217-households.md): without it, signing in only gives the phone a session.
- **"Sign out"** deletes the session on the server and the name on the phone. The kitchen stays.
- **A session that's gone** (signed out elsewhere, 30 days passed, deleted account) makes the next API answer 401; the phone shows "You're signed out" in Settings and offers "Continue with Telegram" again. Nothing on the phone changes.
- **The routes:** `POST /api/auth/links` (make a sign-in link; 10 a day per network address, hashed, as links today), `GET /api/auth/links/{code}` (used yet? with the token; sets the cookie when it is), `GET /api/auth/me` (the first name, or 401), `DELETE /api/auth/session`. The webhook stays `POST /api/messenger/telegram`.
- **What's kept:** the account's id and when it was made; the identity's channel, user id and first name; the session's hash, when it was made and last used. Never the username, phone number or photo.

## Acceptance criteria

Criteria 1 to 4 are e2e tests on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), offline, with the API faked in the browser. Criteria 5 to 9 are unit tests in `apps/api/test` with the fake messenger and the fake store; 10 is a contract test against the fake store and, in CI, the migration on a throwaway Postgres (ADR 0032).

### 1. sign in

- **Given** they're signed out, and Settings open
- **When** they press "Continue with Telegram"
- **Then** they see the one line about what's kept, and "Continue"
- **When** they press "Continue"
- **Then** they see a code like `KM7Q-4HTX`, "Open Telegram", and "Waiting for Telegram"
- **When** Telegram confirms (the fake API says the link is used, with the name "Mayur")
- **Then** Settings says "Signed in as Mayur", with "Sign out"; the code is gone; and the kitchen on the phone is as it was

### 2. the code runs out

- **Given** a code shown, and ten minutes passing
- **Then** it says "That code ran out", with "Try again"
- **When** they press "Try again"
- **Then** a new code is shown

### 3. sign out

- **Given** signed in as Mayur
- **When** they press "Sign out"
- **Then** Settings shows "Continue with Telegram" again, the API was asked to end the session, and the kitchen on the phone stays

### 4. signed out elsewhere

- **Given** signed in as Mayur, and the API now answering 401
- **When** they open Settings
- **Then** it says "You're signed out", with "Continue with Telegram"; the kitchen on the phone stays

### 5. a sign-in link is made

- **When** `POST /api/auth/links`
- **Then** 201 with a code, a token, and when it runs out; the store holds the code, the purpose *sign in*, and a hash of the token, never the token
- **When** it's the 11th from one address today
- **Then** 429

### 6. Start makes the account, once

- **Given** a sign-in link
- **When** the webhook gets Start with its code from Telegram user 42, first name "Mayur", with the right secret
- **Then** an account exists with an identity (telegram, 42, "Mayur"); the link is used; the bot's reply "Signed in. Go back to the app." is sent
- **When** another sign-in link gets Start from user 42
- **Then** the same account is found, not a second one
- **When** the same code arrives again
- **Then** "That code didn't work…", and nothing changes

### 7. the phone gets its session

- **Given** a used sign-in link
- **When** `GET /api/auth/links/{code}` with its token
- **Then** 200 with the first name, and a `Set-Cookie` that is `HttpOnly`, `Secure`, `SameSite=Strict`; the store holds the session's hash, never the cookie's value
- **When** the same, before Start
- **Then** 200 with `used: false` and no cookie
- **When** the token is wrong
- **Then** 404

### 8. the session works, and ends

- **Given** a session cookie
- **When** `GET /api/auth/me`
- **Then** 200 with the first name, and the session's last use moved
- **When** `DELETE /api/auth/session`, then `GET /api/auth/me` with the same cookie
- **Then** 401
- **Given** a session last used 31 days ago
- **When** `GET /api/auth/me`
- **Then** 401

### 9. the cook's code still works

- **Given** an invite link with role *cook* ([spec #207](207-connect-the-cook.md))
- **When** the webhook gets Start with its code
- **Then** the cook is connected as before, and no account is made for her

### 10. any store

- **Given** a store (the fake, and Postgres through the migration)
- **Then** it passes the same tests: a link's purpose, an identity found by channel and user id, a session by hash, last use, delete, and the 30 days

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012). The bot's words are English only (ADR 0031).

- Continue with Telegram · We keep your Telegram name and id, and your kitchen, so every phone in your family sees one plan. Nothing else. · Continue · Open Telegram · Waiting for Telegram · Signed in as {name} · Sign out · You're signed out · That code ran out · Try again
- The bot: Signed in. Go back to the app. · That code didn't work. Ask for a new one in the app.

## Out of scope

- The household, uploading the kitchen, a second phone, the cook as a member: [spec #217](217-households.md).
- Google, as another provider ([spec #150](150-sign-in-google.md)).
- Deleting the account: with the household, #217.
- Sign-in on a phone that cooks: it works the same, but nothing uses it until #217.

## Setup

Nothing new for the owner: the bot and its secrets are done ([docs/runbooks/telegram.md](../docs/runbooks/telegram.md)); the code PR adds running migration 0004 ([docs/runbooks/database.md](../docs/runbooks/database.md)). The Google steps in [docs/runbooks/sign-in.md](../docs/runbooks/sign-in.md) are not needed for this; the PR says so at the top of that runbook.
