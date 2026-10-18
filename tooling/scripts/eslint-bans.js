import { GLOBALS, MESSAGE } from "./eslint-storage.js";

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

/** @type {import("eslint").Linter.Config[]} */
export const bans = [
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
