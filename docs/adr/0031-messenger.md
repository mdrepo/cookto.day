# 0031. One messenger package sends, receives and records every message, in Postgres, through an outbox; Telegram first

- **Status:** Proposed
- **Date:** 2026-10-19
- **Deciders:** Mayur

## Context

cookto.day is the message you send your helper, and everything that makes it the right message ([spec #195](../../specs/195-who-cooks.md)). The planner decides tomorrow on their phone; the cook is on hers. Today the plan reaches her by copy and paste. It should reach her by itself, and what she answers should come back.

What shapes the choice:

- **Sign-in and sync aren't built** ([0025](0025-server.md), [spec #150](../../specs/150-sign-in-google.md)). Messaging shouldn't wait for them, and shouldn't grow its own account system.
- **Channels differ.** WhatsApp charges per message (about US$1–3 a family a month on utility rates, more if Meta classes it marketing), needs approved templates, and verifies the business. Telegram's Bot API is free, has no templates, sends buttons, polls and checklists, edits a sent message in place, and can open a web app with the person's identity attached. It gives no delivered or read receipts to bots.
- **The owner's other product, messenger-service, settled the shape of a sending layer:** one send chokepoint that records every message with a kind, a status and the caller's context; a registry of message kinds; statuses advanced by the channel's webhook, never downgraded; scheduled sends with the reply captured on the same record; the webhook acknowledged first and handled after; and the choice of what to do with a message made outside the messenger. Its pains are known too: messages kept as a JSON array on the conversation row, and an outbox that doubled as history.
- **The cook didn't choose the app.** She gets messages from a bot because someone else connected her. Whatever we keep of her words, she must know, and she must be able to end it.

## Decision

**One package, `packages/messenger`, is the only code that speaks to a messaging service, and it knows nothing of plans, cooks or households.** Pure TypeScript: no Cloudflare, no `fetch`, no database driver. It receives its network function and its store as arguments. It exports:

- `send(to, message, { context, at })`: records the message, puts it in the outbox, and returns its id. The message is one kind from an open registry; `context` is opaque to the package, stored and returned, never read; `at` schedules it.
- `receive(request)`: verifies the webhook, drops an update already seen, records the incoming message against its conversation, and returns one event for a handler the API registers: who, kind, text or button value or media reference, and which of our messages it answers. The reply marks that message *replied*.
- `drain(now)`: sends what the outbox owes, one row at a time per conversation, locking each row with `locked_until` so two drains never send one message. A row is marked *sending* before the call and is never retried from that state: Telegram has no idempotency key, so a crash between the call and the write leaves a message *unknown*, shown, not resent.
- `supports(kind)` per adapter. A channel that can't send a kind says so; the caller chooses a fallback. The package never downgrades a checklist to text on its own.
- a fake messenger and a fake store for the API's tests and the app's browser tests, and contract tests every adapter and every store must pass, as 0025's `Auth` and `Store` have.

**Kinds are added when a spec first sends one.** The registry is open from day one; the first kinds are text, photo, buttons and edit. Planned next: reaction, poll, checklist. Twenty kinds nobody calls would be twenty payload builders and tests, most with no WhatsApp twin.

**Telegram is the first adapter,** `telegram.ts`, the only file that knows the Bot API. The bot stays in private chats (groups off, privacy mode on) and speaks English until a native speaker reviews other words ([0012](0012-localisation.md)). The Worker installs its own webhook, since only it holds the token and the webhook secret ([0030](0030-secrets-only-in-cloudflare.md)).

**Conversations live in Postgres, in three tables the package owns** ([0032](0032-sql-migrations.md) for how they change):

- `conversations`: one per chat on a channel. Channel, chat id, owner (a kind and an id: a link today, a household later), state, last `update_id` seen, started and last-message times. No text.
- `messages`: every message in and out, one row each. Conversation, direction, kind, content, the message it replies to, the channel's message id, time; outgoing rows also status (*queued, sending, sent, delivered, read, replied, failed, unknown*, forward only), the error, and the caller's context.
- `outbox`: only sends not yet made. Message, send at, attempts, next try, `locked_until`. A row leaves when the channel accepts the message.

Never a `messages[]` column on the conversation, and never history in the outbox.

**The Worker reaches Postgres over HTTPS with the publishable key**, through `apps/api/src/network.ts`, the one home of outgoing calls (lint allows `fetch` only there; the Gemini adapter moves to it). Every table denies everything to the anonymous role; the Worker calls `security definer` functions that take the caller's proof (a link token's hash today, a session later) and check it themselves: 0025's "the API checks access itself; row-level security is the second guard". No database driver, no new dependency.

**The outbox is drained by a cron trigger in the same Worker, every minute, and at once after each `send`.** A scheduled message, the 9 pm plan, and a retry after a Telegram outage are the same row.

**Who may send, and to whom, is the API's job, outside the package.** A link is made from a phone and confirmed by the person on the other end messaging the bot first with a code the phone showed. The phone keeps the link's token, which is the only thing that lets it send; with households, the link moves to the household. A code lasts ten minutes and works once. A link sends at most 20 messages a day, 2,000 characters each.

**What we keep, and what she's told.** Messages are kept so the planner can see the thread. The bot's first words say so, and how to stop. `/stop` deletes her conversation and every message in it, both directions, at once, and the bot confirms. Messages older than 90 days are deleted nightly. Only the owner of the conversation can read it. Photos are kept as the channel's file reference, never the file. Logs hold kinds, ids and counts, never content. Deleting the bot's token in Cloudflare stops every message.

## Alternatives

- **A folder inside the API:** the boundary would be a comment, its tests would run with the API's on every PR, and the message is the product. A package, beside `engine`.
- **A Durable Object per conversation:** no cross-object queries, no migrations with rollbacks, and the rows would move to Postgres with households anyway.
- **Keep no text at all,** the first draft: cleaner, but the planner can't see what she said, and "Made" has to be recorded somewhere.
- **WhatsApp first:** the family's channel, but paid, templated and verified; the second adapter, when a family needs it and sees the cost.
- **A Postgres driver in the Worker:** a dependency and a TCP connection per request. HTTPS to PostgREST is enough until it isn't.
- **A bot framework (grammY, Telegraf):** the Bot API is a few calls and a webhook.
- **The cook installs the app instead:** she'd need sign-in and a household, and she'd still want the plan as a message.

## Consequences

- The cook gets tomorrow's plan on her phone from the first spec, without sign-in, and the planner sees the thread.
- The server holds one new kind of data, conversations, under rules she's told and can end.
- A second channel is one adapter and its contract tests. A new kind is one entry and its tests.
- A message can, rarely, be sent twice after a crash; never silently lost.
- No limiter across chats: Telegram's 30 messages a second across all chats isn't a concern until hundreds of households send at 9 pm sharp.
- Revisit if Telegram starts charging bots, or when households arrive and the owner column is rewritten.
