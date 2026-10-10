# 0012. Localisation: every string in one place, right to left by default

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Mayur

## Context

cookto.day is for households in India and Dubai. People read English, Hindi, Marathi and Arabic, and Arabic runs right to left. Ingredients have several names (palak = पालक = spinach), and prices are in ₹ or AED. Strings scattered through code get missed in translation, and layouts built with `left`/`right` break in Arabic.

## Decision

- **Every word the app shows** lives in `src/i18n/`, one file per language. `en.ts` defines the keys; `hi.ts`, `mr.ts` and `ar.ts` are typed against it, so a missing key fails the typecheck. Code never hard-codes UI text.
- **New text ships in all four languages** in the same PR. If an agent can't translate something well, it says so in the PR, and a code owner arranges a translation.
- **Direction follows the language.** Each locale declares `ltr` or `rtl`; the app sets `lang` and `dir` on `<html>`. CSS uses logical properties only (`margin-inline-start`, `inset-inline-end`, `text-align: start`), enforced by `design:check` ([0011](0011-design-guide-and-check.md)). An e2e test checks the Arabic layout.
- **Numbers, dates and money** go through `Intl` with the active locale. Currency comes from the bill (₹ or AED), never from the language.
- **Ingredient names** are data, not UI strings: each ingredient has one id and names in every language, so a bill in English matches a dish written in Hindi.
- The chosen language is remembered in the browser.

## Alternatives

- **An i18n library:** a runtime dependency ([0005](0005-supply-chain-policy.md)) for what a typed object does.
- **Translate later:** the strings never all get found.
- **Machine translation at runtime:** sends people's text to another site ([0013](0013-static-browser-only.md)).

## Consequences

- Every UI change touches four files. That's the cost of four languages.
- Fonts come from the device; Devanagari and Arabic render with system fonts.
