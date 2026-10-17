# #150: Sign in with Google

- **Issue:** #150
- **Approval:** a code owner merging the PR that adds this file. Write no tests or code until it's merged.
- **Changes:** [ADR 0025](../docs/adr/0025-server.md) chose an emailed 6-digit code and turned Google down. The owner chose Google on 17 Oct 2026; the ADR's new note says what changes and what stays.

## Why

Receipt photos (#129), feedback (#146) and, later, a shared household all need to know who's asking. The owner wants sign-in that is free, reliable, and one tap: no codes, no emails.

## Decisions

- **"Continue with Google", one tap.** No passwords and no emailed codes, so no email provider.
- **Through our own API.** The button goes to `cookto.day/api/auth/google`, Google sends the person back to `cookto.day/api/auth/callback`, and the API sets the session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, so the return from Google carries it). No Google script loads in the page; the page still talks only to our own site.
- **Supabase checks the Google sign-in,** on its free plan, in a project in Singapore, as ADR 0025 says. Our own `account_id` stays the id everything refers to.
- **An auth module with providers.** `Auth` (ADR 0025) gets one provider per way in. Google is the first. A WhatsApp code can be added later as one more provider; one person can link both, and still has one account.
- **Signing in stays optional.** The app works fully signed out. Signing in is offered where it's needed: receipt photos, feedback, a second phone.
- **The installed iPhone app is tested on a real iPhone** before this ships: the return from Google must land back in the installed app, signed in. If it doesn't, a Google pop-up is the fallback.

## Acceptance criteria

Each criterion becomes one e2e test, on an Android phone, an iPhone and a desktop (ADR 0002, 0003, 0021), with Google faked at the API's edge; the API gets its own tests.

### 1. sign in

- **Given** they're signed out
- **When** they press "Continue with Google" in Settings, and Google says yes
- **Then** they're back in Settings, it says "Signed in as {email}", and the phone's kitchen is still there

### 2. Google says no

- **When** they cancel at Google
- **Then** they're back in Settings, signed out, with "You're not signed in. Nothing changed."

### 3. the page never sees a token

- **When** they're signed in
- **Then** no script on the page can read a session token, and the page loads nothing from Google

### 4. sign out

- **When** they press "Sign out"
- **Then** they're signed out on this phone, and the kitchen on the phone stays

## Words

English; Hindi, Marathi and Arabic stay preview-only until a native speaker reviews them (ADR 0012).

- Continue with Google · Signed in as {email} · Sign out · You're not signed in. Nothing changed. · Sign in to {do this}

## Out of scope

- Sign in with Apple: it needs Apple's developer account, about $99 a year.
- WhatsApp codes: Meta charges for each; a provider of their own, later.
- Households, invites and sync: the next steps of ADR 0025.

## Setup

The owner's steps (a Supabase project, a Google sign-in client, and their secrets) are in [docs/runbooks/sign-in.md](../docs/runbooks/sign-in.md).
