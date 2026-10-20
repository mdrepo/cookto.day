# #217: One plan on every phone, and the cook is part of the household

- **Issue:** #217
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Needs:** [spec #216](216-sign-in-telegram.md) on main and deployed.
- **Where it lives:** `db/migrations/0005_households`: `households`, `members`, `records`, `changes`, the `role` on `links`, and their functions ([ADR 0032](../docs/adr/0032-sql-migrations.md), [ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)); `apps/api/src/household/`: `routes.ts` (`POST /api/household`, `GET /api/household`, `POST /api/household/links`, `DELETE /api/household/members/{id}`, `POST /api/sync/push`, `GET /api/sync/changes`, `DELETE /api/account`), `sync.ts` (accept a version, append a change), and the messenger's Start handler for invite codes; `packages/data`: `sync.ts` (the pending queue, the cursor, push, pull, one at a time), `household-settings.ts` (kitchen, country, beans, sorted as one synced record; the per-phone ones stay in `settings`), `settings.cook` goes; `packages/usecases`: `startHousehold()`, `joinHousehold()`, `inviteMember()`, `removeMember()`, `deleteAccount()`, `sync()`; `sendTomorrow()` and `scheduleTomorrow()` send through the household; `apps/web`: `features/settings/Household` (members, invite, leave, delete), `features/settings/CookLink` becomes the cook's row in Household, the sync bridge in `app.tsx`. Likely three code PRs: migrations and API; the data layer's sync; the screens and the cook's move.

## Why

Two parents plan on two phones and see two plans. The cook's link belongs to one phone, so only that phone can send, and only while it's awake. And the bot can't act on "Didn't make dinner", because the plan isn't where the bot is. One household on the server, with every phone keeping its copy, fixes all three ([ADR 0033](../docs/adr/0033-telegram-sign-in-and-households.md)).

## Decisions

- **Signing in on a phone with no household starts one.** Right after [spec #216](216-sign-in-telegram.md)'s "Signed in as", the phone uploads its records and its household settings into a new household and becomes its first member, role *plan*. Settings gets a "Household" section: the members, "Invite", and for the signed-in person "Leave" and "Delete my account". The sample kitchen uploads like any other: it's the family's kitchen now.
- **The cook moves with the phone.** If the phone holds a cook link ([spec #207](207-connect-the-cook.md)), the upload hands its token to the API, which makes that link's conversation a member with role *cook*. The phone forgets the token. Settings shows her as "The cook, on Telegram" with "Remove".
- **Inviting is a code with a role.** "Invite" asks "Who?": "Someone who plans" or "The cook". It shows a code and "Send the link" (the bot link, through the share sheet), ten minutes, once. Start with it makes the person a member with that role: the cook needs nothing else; a planner then signs in on their own phone and finds the household.
- **Joining replaces this phone's kitchen.** Signing in on a phone whose account already has a household, when the phone has a kitchen of its own, asks: "This phone has its own kitchen. Replace it with {household}'s? What's on this phone is lost." with "Replace" and "Not now". "Not now" leaves the phone signed in and unsynced, with the question again next time Settings opens. A phone with only the sample kitchen, untouched, isn't asked.
- **Sync, as ADR 0033 says.** Every repository write marks the record pending; a push goes after a short pause, when the app opens, and when the phone is back online; a pull follows each push and each opening. The server takes a higher version and refuses a lower or equal one with its own copy, which the phone saves. Changes pulled are saved through the repositories and announced, so screens update as for any write. One sync at a time; a new one cancels the old; a cancelled sync changes nothing.
- **Settings in two homes.** Kitchen, country, beans and the day that's sorted become one household record, synced. Language, theme, role and onboarding stay per phone.
- **"Looks good" sends through the household.** `POST /api/messenger/send` takes the session, not a link token, and sends to every member with role *cook* (one, usually). The 9 pm schedule stays as today, from the phone; the server's own 9 pm send is the next spec.
- **A planner on a second phone sees what the first did.** "Tomorrow's sorted" and "Sent to the cook" are household facts, so the second phone shows them after a pull. Both phones may press "Looks good"; the second send replaces the first by context, as today.
- **Leaving and deleting.** "Leave" removes this account's membership and clears the phone's kitchen back to the sample; the household stays for the others. "Remove" on a member ends their membership and, for the cook, deletes her conversation and messages, and the bot tells her "You've been removed. Nothing more will come from me." "Delete my account" deletes the account, its sessions and memberships, and when it was the last member the household, its records, changes and conversations; it asks once, "This deletes your account and, as the last member, the household's kitchen on our server. This phone keeps its copy." The bot's `/stop` is unchanged: that person's conversation and messages go, and they're not sent to again; a cook who stops is shown "Stopped" in Household until removed.
- **Retention.** The changes log keeps 90 days; a phone whose cursor is older than that gets everything again from the records. Records live as long as the household.
- **The routes** all take the session; a missing or dead one is 401. Push is at most 500 records a call; a pull page is 500 changes with a cursor. Logs hold counts and ids, never a record.

## Acceptance criteria

Criteria 1 to 9 are e2e tests on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), offline, with the API faked in the browser; the fake API keeps records and a changes log, so two phones can be played by one browser with two storage contexts. Criteria 10 to 15 are unit tests in `apps/api/test`; 16 is the store contract against the fake and, in CI, the migrations on a throwaway Postgres.

### 1. signing in starts the household

- **Given** North Indian loaded, a plan for tomorrow, and the cook connected
- **When** they sign in as Mayur ([spec #216](216-sign-in-telegram.md), criterion 1)
- **Then** Settings shows "Household" with "Mayur, plans" and "The cook, on Telegram"; the API was given every record and the household settings; and the cook's token was handed over and is gone from the phone

### 2. invite a planner

- **Given** signed in, in Household
- **When** they press "Invite", then "Someone who plans"
- **Then** they see a code and "Send the link"
- **When** the other person joins (the fake API says so)
- **Then** Household lists "Priya, plans"

### 3. invite the cook

- **Given** signed in, with no cook
- **When** they press "Invite", then "The cook", and she presses Start (the fake API says so)
- **Then** Household lists "The cook, on Telegram", and "Looks good" sends to her

### 4. a second phone sees the plan

- **Given** Priya signed in on her phone, a member of Mayur's household
- **When** Mayur picks paneer for tomorrow's dinner, and Priya's app opens
- **Then** Priya's Tomorrow shows paneer for dinner
- **When** Priya presses "Looks good"
- **Then** her phone says "Sent to the cook", and Mayur's, on its next pull, says "Tomorrow's sorted" and "Sent to the cook"

### 5. newest wins

- **Given** both phones offline, Mayur swaps dinner to dal, then Priya swaps it to bhindi a minute later
- **When** both come back online
- **Then** both phones show bhindi, and the API holds one record for that meal at its highest version

### 6. joining replaces the kitchen

- **Given** a phone with its own dishes and plans, and Priya's account already in a household
- **When** she signs in on it
- **Then** it asks "This phone has its own kitchen. Replace it with Mayur's?" with "Replace" and "Not now"
- **When** she presses "Replace"
- **Then** the phone shows the household's kitchen, and its own dishes are gone
- **Given** a phone with only the untouched sample
- **When** she signs in on it
- **Then** nothing is asked, and it shows the household's kitchen

### 7. offline, nothing waits

- **Given** signed in, and no network
- **When** they plan tomorrow and press "Looks good"
- **Then** every screen works as signed out; "Couldn't send. Try again." as today
- **When** the network is back
- **Then** the plan is pushed, and "Send again" sends

### 8. leave, and remove the cook

- **Given** Priya signed in on her phone, a member
- **When** she presses "Leave"
- **Then** her phone shows the sample kitchen, signed in, with "Start a household"; Mayur's Household no longer lists her
- **Given** the cook a member
- **When** Mayur presses "Remove" on her
- **Then** she's gone from Household, and "Looks good" no longer sends

### 9. delete the account

- **Given** Mayur the only member
- **When** he presses "Delete my account" and confirms
- **Then** Settings shows "Continue with Telegram", the phone's kitchen is still there, and the API was asked to delete the account

### 10. a household is made from a phone's records

- **Given** a session with no household
- **When** `POST /api/household` with records and settings
- **Then** 201 with the household; every record is stored at its version; the changes log has one row per record; the session's account is a member, role *plan*
- **When** the body carries a cook link's token
- **Then** that link's conversation is a member, role *cook*, and the link no longer answers to its token
- **When** the account already has a household
- **Then** 409

### 11. push takes the newer version

- **Given** a record at version 3 on the server
- **When** a push carries it at version 4
- **Then** 200, it's stored, and a change is appended
- **When** a push carries it at version 3 or 2
- **Then** 200 with that record in `refused`, with the server's copy, and nothing stored
- **When** the session's account isn't a member of that household
- **Then** 403, nothing stored

### 12. pull pages the changes

- **Given** 1,200 changes
- **When** `GET /api/sync/changes?after=0`
- **Then** 500 changes and a cursor; two more calls reach the end; a change for a deleted record carries its `deletedAt`
- **Given** a cursor older than 90 days
- **Then** the answer says to start over, and the first page is every record as it stands

### 13. invites, by role

- **Given** a session in a household
- **When** `POST /api/household/links` with role *cook*, and Start arrives with the code from chat 7
- **Then** a member with role *cook* exists for chat 7's conversation, and the bot says "Connected…" as [spec #207](207-connect-the-cook.md) says
- **When** the same with role *plan*, from Telegram user 42
- **Then** user 42's account (made if needed) is a member, role *plan*, and the bot says "You're in. Sign in on your phone to see the plan."
- **When** a used or old code
- **Then** "That code didn't work…", nothing changes

### 14. sending through the household

- **Given** a session in a household with a cook
- **When** `POST /api/messenger/send` with a text
- **Then** 202, and the drain sends it to the cook's chat
- **When** the household has no cook
- **Then** 409 with `no-cook`
- **When** no session
- **Then** 401

### 15. removing and deleting

- **Given** a household with a cook and two planners
- **When** `DELETE /api/household/members/{cook}`
- **Then** her membership, conversation and messages are gone, and the bot's "You've been removed…" was sent first
- **When** `DELETE /api/account` for one planner
- **Then** the account, its identities, sessions and membership are gone; the household and its records stay
- **When** `DELETE /api/account` for the last planner
- **Then** the household, its records, changes, members and conversations are gone too

### 16. any store

- **Given** a store (the fake, and Postgres through the migrations)
- **Then** it passes the same tests: households and members, a record by household, collection and id, put only when newer, changes in sequence, pages, the 90 days, and delete all the way down

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012). The bot's words are English only (ADR 0031).

- Household · {name}, plans · The cook, on Telegram · Invite · Who? · Someone who plans · The cook · Send the link · Remove · Leave · Start a household · Delete my account · This deletes your account and, as the last member, the household's kitchen on our server. This phone keeps its copy. · This phone has its own kitchen. Replace it with {name}'s? What's on this phone is lost. · Replace · Not now · Stopped
- The bot: You're in. Sign in on your phone to see the plan. · You've been removed. Nothing more will come from me.

## Out of scope

- The server sending the plan at 9 pm by itself, and acting on the cook's replies: the next spec, with the tools and the router.
- Seeing the thread in the app.
- Pantry amounts as changes ("used 1"): whole records, newest wins, for now (ADR 0033).
- Merging two kitchens; a household with two cooks sending to both is fine, choosing between them isn't needed.
- Export and import of the phone's kitchen as a file.
- A privacy page: its own small spec, due before this ships to anyone outside the family.

## Setup

The owner runs migration 0005 ([docs/runbooks/database.md](../docs/runbooks/database.md)) when the first code PR lands. Nothing else.
