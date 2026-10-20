# 0025. Add login, sync and bill forwarding through our own API, on Supabase

- **Status:** Accepted
- **Date:** 2026-10-12
- **Deciders:** Mayur

## Context

[0013](0013-static-browser-only.md) kept everything on the phone: no server, no accounts, no network. It planned for change ("until an ADR decides otherwise"), and three needs now decide it:

- **The schedule must open on another phone,** and a family must share one pantry and one plan.
- **Forwarding bill emails is the moment people remember.** Online shops (RedMart, GrabMart, pandamart, Blinkit) send receipts by email. Forward once, or set a mail rule once, and the pantry fills itself. Email needs a server to receive it.
- **Debugging needs a trace,** which needs requests that reach something we can see.

What doesn't change: bills carry names, addresses and phone numbers, and people should not have to trust us with them. The phone keeps working with no network and no account ([0024](0024-data-layer.md)).

## Decision

**Our own API, on our own domain.** The Worker that serves the site also answers `cookto.day/api/*`; its code lives in `apps/api`. The app talks only to it, never to Supabase or anyone else. So:
- the page's policy becomes `connect-src 'self'`, and nothing else;
- the app ships no Supabase library, which keeps the script budget ([0018](0018-ui-react.md));
- the backend can change without changing the app;
- every request passes one place we can log and trace.

**Supabase holds accounts and synced data,** in a project in Singapore. The API calls Supabase with the person's own session, so Postgres's row-level rules apply as well as ours. **Every table has row-level security on,** and a check fails on a migration that adds a table without it. Migrations live in `supabase/migrations`.

**Sign in with an emailed 6-digit code.** No passwords, no Google. The session is an `HttpOnly`, `Secure`, `SameSite=Strict` cookie set by our API: **JavaScript never sees a token,** so a token refresh re-renders nothing and a script injected into the page can't steal it. Supabase sends the codes through a free-tier email provider (Brevo or Resend), chosen in its PR; Supabase's own sender allows only a few emails an hour, to the team only.

**Supabase can be swapped out.** The app already knows nothing of it. Inside the API, Supabase sits behind two small interfaces: `Auth` (send a code, check a code, read a session, sign out) and `Store` (households, members, sync changes). One adapter folder implements them, and lint lets only that folder import Supabase. Both interfaces have contract tests that any replacement must pass. To keep a move cheap:
- **Our own ids.** Data refers to our `account_id`, never Supabase's user id; one table maps the two.
- **Plain SQL migrations,** which any Postgres host runs.
- **The API checks access itself.** Row-level security is a second guard, not the only one, so a host without it is still safe.
- **No passwords to move.** Sign-in is by emailed code, so a new auth service needs only each person's email.

**Signing in is optional.** Signed out, the app works fully on the phone. Signing in creates a household and uploads the phone's data into it. Another member joins with a one-time invite link. Joining a household when the phone already has data asks which to keep; merging two households is out of scope.

**Sync, local first** ([0024](0024-data-layer.md)):
- Changes queue on the phone and are sent after a short pause, when the app opens, and when it's back online.
- The phone asks for "changes since my last cursor"; the server keeps a sequence number per household.
- A record's newer `version` wins. Pantry amounts sync as changes ("used 1"), not totals, so two people using the same packet both count.
- One sync runs at a time: a new one cancels the one in flight, and a cancelled sync changes nothing on the phone.

**Bill forwarding.** Each household gets an address, `<code>@bills.cookto.day`. Cloudflare Email Routing hands each email to the API, which:
1. accepts it only if the code is a household's and the sender is a member's verified email; anything else is dropped;
2. shows mail-rule confirmations (Gmail sends one when you set up auto-forwarding) in the app, so setting up the rule works;
3. finds the shop from the original sender, and reads it with that shop's parser;
4. saves the shop, date, items and prices to the household, and **throws the email away.** It is never stored. Logs hold the shop and a count, never content;
5. tells the household when an email couldn't be read: the shop and date only.

Parsers are pure TypeScript in `packages/parsers`, so the same code reads a PDF on the phone and an email in the API.

**What the server holds, and what it never holds:**

| Holds | Never holds |
|---|---|
| Account email; household and members | Bill PDFs: they are read on the phone |
| Pantry, dishes, plan, settings | Bill emails, after reading them |
| Each bill's shop, date, items and prices | Names, addresses or phone numbers from bills |

Deleting an account deletes its data within 30 days, and export works at any time.

**AI only through our API,** only for what the phone can't do, only after the person agrees, and only with providers that don't keep or train on the data. Each AI feature gets its own spec.

**A trace header.** The API logs `x-cookto-trace` when a request carries one. The Settings switch that adds it comes with the observability ADR.

**Free plans first, measured.** Cloudflare's free plan gives each request 10 ms of processing; waiting on Supabase doesn't count. A test times every shop's parser on its sample email and fails past 5 ms, so a slow parser shows up before it reaches users. If emails outgrow the free plan, parsing moves to a Supabase Edge Function, still without storing the email, before we pay. If we do take Cloudflare's $5 plan, its email sending covers the sign-in codes too.

**Lint and tests.** `fetch` is allowed only in `packages/data`'s network adapter. E2e tests stay offline ([0021](0021-test-every-engine.md)), with the API faked in the browser. The API has its own unit tests, and row-level rules are tested against a local Supabase.

**Order of PRs:** `apps/api` with a health endpoint and the policy change; sign-in; households and invites; sync; bill forwarding, with the first Singapore shop.

## Alternatives

- **The app talks to Supabase directly:** about 50 KB of library, the token in JavaScript, and a second site in the page's policy.
- **Firebase:** offline support built in, but documents are hard to query for a week plan, and Google holds everything.
- **All Cloudflare (D1, our own login):** one vendor, but login is the last thing to write ourselves.
- **Firebase Auth for the codes, to avoid an email provider:** it sends sign-in links, not codes, and its free plan allows 5 such emails a day. More needs a billing account, and it adds a second vendor beside Supabase.
- **Sign in with Google:** one tap, but awkward redirects in an installed web app, and Google learns who uses cookto.day. Can be added later.
- **Reading people's Gmail for them:** never. It means reading a whole inbox, and Google requires a paid yearly audit.
- **Upload bill PDFs to the server:** easier parsing, but the bill leaves the phone when it doesn't need to.

## Consequences

- The schedule opens on any phone, a family shares one plan, and forwarded bills fill the pantry.
- We now run a service: uptime, costs (free tiers, measured, as above), backups and deletion requests.
- A privacy policy page must say exactly what the table above says.
- Supabase pauses a free project after a week with no use. Fine for a live app; forks of the template should know.
- Supersedes [0013](0013-static-browser-only.md). What it got right stays: the phone first, nothing from other sites, small pages.

## Notes (2026-10-16)

- **AI providers:** [0028](0028-receipt-photos-ai.md) refines the sentence on AI: a provider may keep what we send for a limited time only to detect abuse, and must never train on it. The app says so before the person agrees.

## Notes (2026-10-18)

- **Sign in with Google, not an emailed code** (spec #150). The owner chose one tap over codes on 17 Oct 2026. What changes: no email provider; the session cookie is `SameSite=Lax`, so the return from Google carries it. What stays: the page talks only to our API, loads nothing from Google, and never sees a token; Supabase checks the sign-in; our own `account_id` is what data refers to; signing in is optional. `Auth` takes one provider per way in, so a WhatsApp code can follow as another.
- **Bill forwarding** keeps its rule that only a member's verified email is accepted: a Google account's email is verified by Google.

## Notes (2026-10-20)

- **Telegram first, not Google** ([0033](0033-telegram-sign-in-and-households.md), specs #216 and #217). The owner chose on 20 Oct 2026 to put the plan on the server behind sign-in, and to sign in through the bot that already connects the cook: a code and Start, no redirect, no Google client, no Supabase Auth. What stays: our own `account_id`, the `HttpOnly` cookie, signing in optional, the phone's copy first. The sync's shape and what the server holds are in 0033; pantry amounts sync as whole records until "used 1" is needed. Google remains a later provider (spec #150).
