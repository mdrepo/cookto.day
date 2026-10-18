# 0028. Read receipt photos with Gemini Flash-Lite, only through our API, within hard limits

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** Mayur

## Context

Market and corner-shop receipts come on paper, with no PDF to read ([#127](../../specs/127-receipt-pdf.md) reads PDFs on the phone). On 16 October we tested a real one: faded thermal paper, creased, half in shadow.

| Reader | Lines right | Time | Cost a receipt |
|---|---|---|---|
| Tesseract, the free OCR a phone can run | 9 of 11, only after cleaning the photo; one weight wrong | not measured on a phone | free, about 4 MB to download |
| Gemini 2.5 Flash-Lite | 11 of 11, raw photo, twice | 5 s | about $0.0003 |
| Gemini 3.5 Flash-Lite | 11 of 11, raw photo, twice | 4 s | about $0.002 |

An AI call costs us money each time, so the endpoint is a target. People could run up the bill, or use it as free general-purpose AI. [0025](0025-server.md) allows AI only through our API, after the person agrees, "only with providers that don't keep or train on the data". Gemini's paid tier never trains on what we send, but Google logs it for a limited time, only to detect abuse; there is no self-serve way to turn that off. Its free tier does train on it.

## Decision

**Gemini 2.5 Flash-Lite, on a billed Google project.** Never the free tier. The model is a setting, `RECEIPT_MODEL`, so moving to a newer Flash-Lite (when Google retires this one) changes no code; it changes only after the new model passes the check in [`docs/runbooks/receipt-photos.md`](../runbooks/receipt-photos.md).

**This refines one sentence of 0025:** a provider may keep what we send for a limited time only to detect abuse, and must never train on it. Before the first photo, the app says so in plain words. The rest of 0025 stands.

**One endpoint, `POST /api/receipts/read`, behind five layers, cheapest first:**

1. **Switch.** Off unless `RECEIPT_PHOTOS` is `on` and the key is set. Off answers 503. Off is the default, and turning it off is the emergency stop.
2. **Who.** Only from `https://cookto.day` (the `Origin` header) and only signed in (0025's session). Until sign-in ships, nobody gets through.
3. **What.** The body is one JPEG or WebP photo, judged by its first bytes, not its label, at most 1.5 MB, read with a cap. Nothing the phone sends but the photo reaches the AI.
4. **How many.** One Durable Object counts every call, atomically, before the AI is called:
   - per household: 3 a day and 30 a month;
   - per network address: 20 a day (stored only as a keyed hash, for a day);
   - everyone together: 2,000 a day.

   Days and months are UTC. Over a limit answers 429, saying which limit and when it resets. If the AI fails, the call is given back; "not a receipt" is not.
5. **The AI call.** Our fixed instruction and the photo; an answer forced into a schema of item lines; temperature 0, no thinking, at most 4,096 output tokens, a 20-second timeout, no retries. The key travels only in a header, and only the adapter holds it.

**We check the answer ourselves.** Its shape, lengths and numbers are validated again; at most 80 lines; a line whose quantity × price isn't its amount is marked "check"; the lines are compared with the printed total. Only the shop, the date and the lines go back, never the AI's raw text. No lines answers 422, "not a receipt".

**A money backstop.** The Google project gets a spend cap of $10 a month and an alert at $5. Our counter is the real limit: Google applies its cap up to about 10 minutes late. Worst case, every limit reached every day: 2,000 × $0.0003 = $0.60 a day.

**Nothing kept.** The photo is never stored or logged. Each call logs one line: the outcome, the time taken, how many lines, and the tokens used. No addresses, no accounts, no content.

**Checked by lint:** `fetch` only in the AI adapter, `console` only in the API's log helper. The API's types come from `@cloudflare/workers-types` (development only).

## Alternatives

- **Free OCR on the phone (Tesseract.js):** private and free, but 9 of 11 lines on a cleaned photo, and about 4 MB to download. It may come later, as the offline fallback.
- **Claude Haiku 4.5:** not tested on receipts; about 15 times the price.
- **Gemini 3.5 Flash-Lite now:** same accuracy, 7 times the price. It's the next step when 2.5 retires.
- **Cloudflare Turnstile against bots:** loads a script from another site, which our page policy forbids. Sign-in plus the limits cover it.
- **Cloudflare's rate-limiting binding:** approximate, counted per data centre, and can't hold a month. The Durable Object is exact.
- **Counting in Supabase:** a table with row-level rules, and a round trip per call. The limits belong at the edge, next to the endpoint.
- **Remembering photos already read, on the server:** means storing results; the limits already bound the cost. The phone avoids sending the same photo twice.

## Consequences

- Receipt photos work once sign-in ships and the keys are set; until then the endpoint is built and tested, and refuses everyone.
- The worst-case cost is known and capped twice.
- A third company, Google, briefly sees receipt photos. The app says so first, and the person chooses.
- When Google retires 2.5 Flash-Lite, we switch the setting after the runbook's check.
- Revisit the limits when real families hit them.

## Notes (2026-10-16)

- **The worst case is higher than the Decision says.** Its $0.60 a day assumes real receipts (about $0.0003 each). A photo whose text tells the AI to ramble makes it write until the 4,096-token cap: about $0.0017 a read (tested). With every limit reached that way, about $3.40 a day, so Google's $10 cap stops it within three days. Reaching it takes about 667 signed-in households; one abusive household costs at most about half a cent a day. The answer never reaches anyone: our check drops it.
- **The schema has no line limit.** Gemini refuses `maxItems: 80` as too complex to serve; our check keeps at most 80 lines.
- **A read is given back whenever Google refuses or fails** (any HTTP error), not only when it's busy or down: Google doesn't bill a failed request ("If your request fails with a 400 or 500 error, you won't be charged", its billing page). Only a billed answer that we can't use still counts.

## Notes (2026-10-17)

These notes update two numbers in the Decision without changing it: the AI now answers in rows with at most 2,560 output tokens, not 4,096, and the lines are compared with the printed subtotal, not the total.

How far prompt injection can reach, and three changes that shrink it (spec #129, rules 6 and 8). Text printed in a photo can always steer the AI; the design keeps what it can do small: it sees only our instruction and that one photo, has no tools, and only checked item lines reach the person, who reviews them before anything is added.

- **The AI answers in rows, with at most 2,560 output tokens.** Each item is one string, `name|quantity|unit price|amount`, instead of a JSON object; Gemini pretty-prints objects, and the spaces were half the bill. Measured: a real 11-line receipt took 297 output tokens instead of 607, and a made-up 80-line receipt 1,928, which the cap clears by a third. An answer run up to the cap now costs about $0.0011, not $0.0017.
- **Signs of abuse end the household's day:** an answer cut off at the cap, not JSON, a line over 120 characters, or a name with a link, an email address or a long number (a phone or card number). The answer is refused whole and the log line names the sign. The household's daily count is set to its limit, so a clumsy abuser gets one costly read a day instead of three.
- **Not every odd line is a sign.** On a made-up but honest receipt, the AI left quantities empty, wrote "0.912kg" and kept a bag charge. Such lines are read leniently or dropped one by one; refusing the whole answer for them, and ending the family's day, would punish honest receipts.
- **The worst case, again.** An abuser who keeps each answer just under the cap, with clean rows, isn't struck. So every limit reached that way is about 2,000 × $0.0011 ≈ $2.10 a day, from about 667 signed-in households; Google's $10 cap stops it within about five days. One household costs at most about a third of a cent a day.
- **Rejected:** a second AI to check the first (doubles the cost, and can be steered the same way); filtering words out of the photo (attackers rephrase).
