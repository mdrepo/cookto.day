import { GLOBALS, MESSAGE } from "./eslint-storage.js";
import { RAW_HTML } from "./eslint-syntax.js";

// Bans that keep shared logic in one place and tests honest (the code
// review of 17 Oct 2026, guardrail 9 of its list). Each message says where
// the code belongs instead.
//
// A file gets one setting per rule (a later block replaces an earlier one),
// so the date ban repeats storage's global bans for the files it covers.

const DATES =
  "Dates are worked out in one place: the engine (packages/engine: addDays(), daysLeft()) for rules, and apps/web/src/platform.ts for the clock (today(), now()). Use those; don't do date arithmetic in a screen, a use case or the kit.";

const STATIC_MARKUP =
  "A test on static markup runs no clicks, effects or styles, so it can pass with the part gutted. Render into a DOM and use the part the way a person would.";

const SLEEP =
  "A fixed wait is a guess: too short and the test flakes, too long and it proves nothing. Wait for what should happen (expect(...).toBeVisible()), or move the clock with page.clock.";

const SELECTOR =
  "Specs find things the way people do, by role and name (ADR 0003). Markup lives only in e2e/support: add a helper there.";

const raw = ["innerHTML", "outerHTML", "insertAdjacentHTML"].map(
  (property) => ({
    property,
    message: RAW_HTML,
  }),
);
const sleep = { property: "waitForTimeout", message: SLEEP };
const selector = { property: "locator", message: SELECTOR };

// Specs written before these rules: each file leaves the list when it's
// fixed, and none joins it. Keep it shrinking.
const SPECS_WITH_SELECTORS = [
  "apps/kit/e2e/button-card.spec.ts",
  "apps/kit/e2e/card-action-choice-legend.spec.ts",
  "apps/kit/e2e/chip-tag-input.spec.ts",
  "apps/kit/e2e/choice-steps-actionbar.spec.ts",
  "apps/kit/e2e/icon.spec.ts",
  "apps/kit/e2e/layouts.spec.ts",
  "apps/kit/e2e/logo.spec.ts",
  "apps/kit/e2e/rows.spec.ts",
  "apps/kit/e2e/today-parts.spec.ts",
  "apps/kit/e2e/warm-layout.spec.ts",
  "apps/web/e2e/dish-page.spec.ts",
  "apps/web/e2e/dish-photos.spec.ts",
  "apps/web/e2e/languages.spec.ts",
  "apps/web/e2e/motion.spec.ts",
  "apps/web/e2e/warm-layout.spec.ts",
];
const SPECS_WITH_SLEEPS = ["apps/web/e2e/undo.spec.ts"];
const SPECS = ["apps/*/e2e/**/*.spec.ts", "packages/*/e2e/**/*.spec.ts"];

/** @type {import("eslint").Linter.Config[]} */
export const bans = [
  {
    // Browser specs: no fixed sleeps, no raw selectors.
    files: SPECS,
    rules: {
      "no-restricted-properties": ["error", ...raw, sleep, selector],
    },
  },
  {
    files: SPECS_WITH_SELECTORS,
    rules: { "no-restricted-properties": ["error", ...raw, sleep] },
  },
  {
    files: SPECS_WITH_SLEEPS,
    rules: { "no-restricted-properties": ["error", ...raw, selector] },
  },
  {
    // Screens, use cases and the kit: no `Date`, so no fifth way to count
    // days. The engine and the data layer may; the API keeps its own clock.
    files: [
      "apps/web/src/**",
      "apps/kit/src/**",
      "packages/usecases/src/**",
      "packages/ui/src/**",
    ],
    ignores: ["apps/web/src/platform.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...GLOBALS.map((name) => ({ name, message: MESSAGE })),
        { name: "Date", message: DATES },
      ],
    },
  },
  {
    // Tests render the way people use the app. The kit's own harness is the
    // one file left on static markup, until it renders into a real DOM.
    files: ["**/test/**"],
    ignores: ["packages/ui/test/render.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-dom/server",
              importNames: ["renderToStaticMarkup", "renderToString"],
              message: STATIC_MARKUP,
            },
          ],
        },
      ],
    },
  },
];
