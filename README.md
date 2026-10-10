<img src="src/brand/icon.svg" width="96" alt="cookto.day: a smiling pressure cooker">

# cookto.day

What to cook today, from the groceries you already have.

Add your grocery bills (quick-commerce invoices from Blinkit, Zepto, Swiggy Instamart and BigBasket in India; Talabat Mart, Noon Minutes and Carrefour in Dubai). cookto.day keeps track of your fridge and pantry and suggests what to cook today from your own household's dishes, using up what's about to go off first. In English, हिन्दी, मराठी and العربية, with prices in ₹ and AED.

It's free, there are no accounts, and it runs entirely in your browser: your bills and pantry never leave your device.

> **Status:** early. The guardrails are in place; the app itself is a first page.

## Run it

```sh
bun install                        # Bun version: "packageManager" in package.json
bun run dev                        # http://localhost:3000
bun run build                      # static site in dist/
```

## Check it

```sh
bun run check                      # what CI runs on every PR
bunx playwright install chromium   # once
bun run e2e                        # browser tests, offline
```

## This repo is also a boilerplate

This repo is also my boilerplate for AI contributions: clone it, read [`AGENTS.md`](AGENTS.md). Every rule that matters is enforced by a script, a hook or CI; the Markdown files explain why. The write-up: [A repo boilerplate for AI contributions](https://mayurdube.com/writing/repo-boilerplate-for-ai-contributions/).

- [`AGENTS.md`](AGENTS.md): the rules, each with what enforces it
- [`docs/workflow.md`](docs/workflow.md): how a person drives an agent through a change, with a worked example
- [`docs/adr/`](docs/adr/README.md): why each rule exists
- [`DESIGN.md`](DESIGN.md): how it looks, enforced by `bun run design:check`

## Licence

[MIT](LICENSE)
