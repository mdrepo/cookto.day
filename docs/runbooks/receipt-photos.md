# Runbook: receipt photos

How to set up, check, turn on and stop the AI that reads receipt photos ([ADR 0028](../adr/0028-receipt-photos-ai.md), [spec #129](../../specs/129-receipt-photos.md)). A code owner does these steps; an agent never holds the key.

## 1. Set up Google (once)

1. In [Google AI Studio](https://aistudio.google.com), create a project for cookto.day and **turn on billing**. The free tier lets Google train on what we send, so it's never used (ADR 0028).
2. Create an API key in that project. In the Google Cloud console, under **APIs & Services → Credentials**, restrict the key to the **Generative Language API** only.
3. In AI Studio, set the project's **spend cap to $10 a month**.
4. In the Cloud console, under **Billing → Budgets & alerts**, add a **$5 budget** that emails you.

## 2. Give the key to the API (once)

In the Cloudflare dashboard, open **Workers & Pages → cookto-day → Settings → Variables and Secrets**, and add a **secret** named `GEMINI_API_KEY`. Paste the key there and nowhere else: not in the repo, not in GitHub, not in a chat.

A deploy keeps secrets, so this survives every merge.

## 3. Check a model

Do this before turning reading on, and before changing `RECEIPT_MODEL`.

```sh
GEMINI_API_KEY=... bun apps/api/scripts/try-reader.ts path/to/receipt.jpg gemini-2.5-flash-lite
```

It reads the photo exactly as the API does (same instruction, schema, limits and checks) with the model you name, and prints the lines. A phone photo over 1.5 MB must be shrunk first, as the app will: `sips -Z 1600 receipt.jpg`. Try at least three of your own receipts, including a creased one. Every line should be right, and none marked "check" unless the receipt really is unclear. **Never commit the photos:** receipts can carry names and card digits.

## 4. Turn it on

Only once sign-in has shipped. In a PR, set `"RECEIPT_PHOTOS": "on"` in `apps/web/wrangler.jsonc`; merging it deploys it.

## Stop it now

**Delete the `GEMINI_API_KEY` secret** in the Cloudflare dashboard (step 2). It takes effect at once, every read answers 503, and a deploy won't bring it back. Then set `RECEIPT_PHOTOS` to `off` in a PR, add a new key when you're ready, and turn it on again.

Changing `RECEIPT_PHOTOS` in the dashboard also works at once, but the next deploy puts back what `wrangler.jsonc` says.

## Limits

Per household 3 a day and 30 a month; per network address 20 a day; everyone 2,000 a day (UTC). They live in `apps/api/src/usage/limits.ts`; changing them is a PR, with the reason.
