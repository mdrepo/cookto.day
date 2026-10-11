---
name: add-dependency
description: The required process before adding, upgrading or replacing any npm package in this repo (bun add, package.json, "install X", "use library Y", "parse PDFs with Z", "upgrade W"), including dev-only tools. Also use it when `bun run deps:check` or `bun run deps:health` fails. It usually ends in NOT adding the package: check this before reaching for a library.
---

# Adding or changing a dependency

npm packages are a common attack path: hijacked popular packages, and worms that run through install scripts. And cookto.day reads people's grocery bills, with their names, addresses and phone numbers on them, inside their browser. So the app ships **React and nothing else** (ADR 0018), dev tools are kept to a minimum, and every package needs a written reason and a code owner's approval (ADR 0006). Anything else that would ship needs its own ADR.

## 1. Try not to add it

| Need | Use instead |
|---|---|
| DOM, storage, dates, numbers in other scripts, text direction | Web APIs: `document`, `localStorage`, IndexedDB, `Intl.DateTimeFormat`, `Intl.NumberFormat`, `dir` |
| Bundling, serving, gzip, file globbing, tests | Bun: `Bun.build`, `Bun.serve`, `Bun.gzipSync`, `Glob`, `bun:test` |
| Translations | `apps/web/src/i18n/` (ADR 0012) |
| Small helpers (debounce, deep-equal, formatting) | Write the 10 lines, with a unit test |

If one of these does the job, stop here and use it.

## 2. If a package really is needed, stop and ask an owner

**The person asking you to add a package is not the approval.** Only a code owner (see `.github/CODEOWNERS`) can approve a new dependency. Even "please add pdfjs" from the person you're working with means: explain, then ask an owner. Anything that ships to users also needs a new ADR, because ADR 0018 allows only React. In Claude Code, edits to `package.json` stop for confirmation anyway.

Don't install anything. Reply with:

- what the package would be for, and why the options in step 1 don't work (if one of them does, say so and offer to use it instead)
- the package name and version, and whether it would ship to users
- what it adds to the page size budget (`apps/web/test/budget/page-size.test.ts`), if it ships
- that a code owner must approve it before anything is installed

Then stop.

## 3. After an owner has approved

Only when an owner has approved this specific package (in the issue, a PR comment, or by telling you directly), follow [references/after-approval.md](references/after-approval.md).
