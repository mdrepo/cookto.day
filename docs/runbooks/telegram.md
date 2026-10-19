# Runbook: the Telegram bot

How to make the bot that sends the plan and takes the cook's replies, and give its token to the API. A code owner does these steps; an agent never holds the token, and it never goes in the repo, GitHub or a chat. The spec and the privacy ADR come before any message is sent.

## 1. Make the bot (once)

Telegram bots are made by talking to Telegram's own bot, BotFather.

1. In Telegram, search for **BotFather**. Open the one with the blue verified tick, username `@BotFather`. Anything else with that name is someone else's.
2. Send `/newbot`.
3. It asks for a **name**, what people see in the chat. Answer `cookto.day`.
4. It asks for a **username**, which must end in `bot` and be free. Try `cooktoday_bot`; if that's taken, `cookto_day_bot`.
5. It replies with the token: a number, a colon, then about 35 letters and digits. **Copy it. Paste it nowhere but the script below.** If it ever leaks, send `/revoke` to BotFather and run the script again with the new one.

Two settings worth doing now, also in BotFather:

- `/setjoingroups` → **Disable**: the bot talks to people one at a time, never in groups.
- `/setprivacy` → **Enable**: in any chat it is in, it only sees messages sent to it.

`/setdescription`, `/setabouttext` and `/setuserpic` can wait for the spec.

## 2. Give the token to the API (once)

Once on this laptop, log Wrangler in: `bunx wrangler@4.147.0 login` opens Cloudflare in the browser.

Then run the script once; the first run only makes the file to fill in:

```sh
sh apps/api/scripts/secret.sh
```

Open `~/.config/cookto.day/secrets.env`. It has one line per secret, all blank. The file is outside the repo, so it can't be committed by mistake. Fill in two lines:

```
TELEGRAM_BOT_TOKEN=123456789:AAH...the token from BotFather
TELEGRAM_WEBHOOK_SECRET=random
```

`random` tells the script to make a 64-character secret itself; Telegram will send it with every update, and the API refuses any update that doesn't carry it. Save the file and run the script again. It checks each value looks right, saves it as a Worker secret, blanks the file so the laptop keeps no copy, and checks that cookto.day still answers. The token is now only in Cloudflare and in BotFather (`/token` shows it again).

## 3. Point Telegram at the API (after the bot PR deploys)

The bot PR adds a script that tells Telegram where to send updates (`setWebhook` with the secret above). Run it once after that PR is live; the PR's runbook change says how.

## Stop it

- **Stop replies at once:** in Cloudflare, **Workers & Pages → cookto-day → Settings → Variables and Secrets**, delete `TELEGRAM_BOT_TOKEN`. The API can't send, and ignores what comes in.
- **Stop the bot for good:** `/deletebot` in BotFather.
