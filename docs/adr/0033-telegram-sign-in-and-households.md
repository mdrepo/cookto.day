# 0033. Sign in with Telegram, and a household's plan lives on the server, with every phone keeping a copy

- **Status:** Proposed
- **Date:** 2026-10-20
- **Deciders:** Mayur

## Context

The cook now gets tomorrow's plan on Telegram ([spec #207](../../specs/207-connect-the-cook.md)). The next step is what she sends back: "Got it", "No paneer", "Didn't make dinner". A button press lands on the server, because Telegram talks to the server. But the plan is only on the planner's phone ([0013](0013-static-browser-only.md), [0024](0024-data-layer.md)): the server holds the text it sent and nothing else. So the server can record her answer, but can't act on it. And two phones in one family each have their own plan.

[0025](0025-server.md) already decided the shape of the fix: optional sign-in, a household on the server, phones that sync, local first. It isn't built. It chose an emailed code, then Google ([spec #150](../../specs/150-sign-in-google.md), 17 Oct). Since then the Telegram bot shipped, with a sign-in in all but name: the phone shows a code, the person presses Start in the bot, the bot sees who they are, the phone polls and learns it. The owner chose on 20 Oct 2026 to move the plan to the server, behind sign-in, and to sign in through Telegram.

What shapes the choice:

- The family already has Telegram: the cook does, and whoever connected her.
- Spec #150's open risk was Google's redirect losing the installed iPhone app. A poll has no redirect.
- The cook never installs the app. Whatever makes her a member must work from Telegram alone.
- Signed out, the app must keep working fully on the phone, with no network ([0024](0024-data-layer.md)). Most people will never sign in.

## Decision

**Telegram is the first way to sign in.** "Continue with Telegram" in Settings shows a code and a link to the bot, as "Connect the cook" does. Start with the code tells the API who the person is on Telegram; the phone, polling with the code's token, gets a session cookie back. No Google client, no email provider, no Supabase Auth: the bot's webhook, with its secret, is the proof of identity. `Auth` ([0025](0025-server.md)) keeps one provider per way in, and Telegram is the first one built. Google can follow as another; spec #150 stays approved for that day.

**A session is a cookie, `HttpOnly`, `Secure`, `SameSite=Strict`, set and read only by our API.** JavaScript never sees a token. Sessions are rows holding a hash, last used, and the account; 30 days from last use; "Sign out" deletes the row.

**An account is ours.** `accounts` has our own id and when it was made; `identities` maps a channel and the person's id on it (Telegram's user id) to the account, with the first name Telegram gave, for "Signed in as". Nothing else about the person is kept: no phone number, no username.

**A household owns the kitchen.** When an account with no household signs in, the phone's records are uploaded into a new household, and the account is its first member, role *plan*. Members have an account, or only an identity: the cook is a member through her Telegram identity and never opens the app. Each member has a role, *plan* or *cook* ([0026](0026-meals-belong-to-people.md), [spec #195](../../specs/195-who-cooks.md)), and a conversation of their own in the messenger ([0031](0031-messenger.md)) once they've pressed Start.

**One code for every way in.** A code is made by a signed-in phone (or by a phone about to sign in), lasts ten minutes, works once, and says what it's for: *sign in* (this phone), or *invite* with a role (someone else, through the same bot link). The cook's link of [spec #207](../../specs/207-connect-the-cook.md) becomes an invite with role *cook*: pressing Start makes her a member. The `links` table of 0003 grows into this; a link a phone holds from before is moved to the household when that phone signs in, so nobody connects the cook twice.

**The phone's copy stays what screens show** ([0024](0024-data-layer.md)). Sync adds a changes log, it changes no screen:

- **The server keeps each household's records whole,** one row per record (`household`, `collection`, `id`, the record as JSON, `version`, `updated_at`), and **a changes log** with one sequence per household: every accepted write appends a row.
- **Push:** after a write, when the app opens, and when it's back online, the phone sends the records it changed since its last push. The server takes a record whose `version` is higher than the one it holds, and refuses one that isn't, answering with its own copy. The newer version wins; on a tie the server's copy wins.
- **Pull:** the phone asks for changes after its cursor, in pages, and saves them through the same repositories, which announce them like any write.
- **One sync runs at a time;** a new one cancels the one in flight, and a cancelled sync changes nothing on the phone.
- **What syncs:** the record collections (members, plans, cooked, my dishes, pantry, shopping, saves) and the household's settings (kitchen, country, beans, the day that's sorted) as one record. Per-phone settings don't: language, theme, role, onboarding. The cuisine packs are data in the app, never synced.
- **Pantry amounts sync as whole records for now,** newest wins. Two people using one packet before syncing lose one use. [0025](0025-server.md)'s "sync as changes" comes when it bites.
- **Joining a household that already exists replaces this phone's kitchen with the household's,** after a plain warning. Merging two kitchens is out of scope, as 0025 said.

**The server reads the plan only through the household.** A tool that acts on the cook's reply (the next spec) reads and writes household records through the same functions the phones use, so its change reaches every phone as a normal pull. No second copy of the plan, and no domain in the messenger.

**Access is checked by the API, with row-level security as the second guard** ([0025](0025-server.md), [0031](0031-messenger.md)): every table denies the anonymous role, and the Worker calls `security definer` functions that take the caller's proof, the session's hash, and check it themselves against the membership. Migrations as [0032](0032-sql-migrations.md).

**What the server holds now, and what it never holds:**

| Holds | Never holds |
|---|---|
| Account id; Telegram user id and first name; session hashes | Phone number, username, or anything else from Telegram |
| Household, members and roles | Bill PDFs, bill emails, receipt photos |
| Plans, cooked meals, dishes, pantry, shopping, kitchen settings | Names, addresses or phone numbers from bills |
| Conversations and messages, 90 days ([0031](0031-messenger.md)) | The content of any log line |

**Deleting is at once.** "Sign out" ends this phone's session. "Delete my account" in Settings deletes the account, its identities and sessions, and its memberships; when it was the last member, the household, its records, its changes and its conversations go too. The bot's `/stop` deletes that person's conversation and messages, as today, and stops messages to them; it doesn't delete the account. The phone's own copy stays until the person clears it.

## Alternatives

- **Google first, as spec #150 chose:** one tap, but a redirect into an installed app, a Google client to keep, and a second identity for people who already have Telegram. Kept as a later provider.
- **Telegram's Login Widget:** a script from telegram.org in our page, which [0025](0025-server.md) forbids. The bot deep link does the same with nothing loaded.
- **The server builds the plan text and sends it at 9 pm by itself:** right, and it's what the household makes possible, but it needs the share text in the engine and the household's timezone. The next spec, with the tools.
- **Move the plan to the server and drop the phone's copy:** every screen would wait on the network, and the app would stop working signed out. [0024](0024-data-layer.md) stays.
- **Operation-based sync (CRDTs, "used 1"):** right for pantry counts, more code than the plan needs today. Whole records first.
- **Supabase Auth with a custom provider:** a second system to map to ours, for a check the bot's webhook already makes.

## Consequences

- One plan on every phone in the family, and the bot can act on what the cook says.
- Signing in stops being a feature for later: it's the door to Telegram. Most people still never go through it.
- The server holds the family's kitchen. The privacy page must say the table above, and the first words at sign-in must too.
- Everyone who syncs needs Telegram. A family without it waits for the Google provider.
- The API grows a data surface (records, changes) beside the messenger; both use the same function-and-secret pattern.
- Supersedes nothing: [0025](0025-server.md) stands, with this ADR as its note on the provider, the sync's shape, and what the server holds. Revisit the pantry rule when two people share a packet, and the provider when a family without Telegram asks.
