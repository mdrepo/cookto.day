import { RAW_HTML } from "./eslint-syntax.js";

// ADR 0024: only packages/data, and packages/data-web (the browser's storage
// for it), touch storage or the network. The web app hands data-web's stores
// to data in one file, apps/web/src/platform.ts.
//
// A file gets one setting per rule (a later block replaces an earlier one),
// so this block repeats the general raw-HTML property bans.

const MESSAGE =
  "Only packages/data and packages/data-web touch storage or the network (ADR 0024). Read or write through a repository; the app hands the browser's storage to it in apps/web/src/platform.ts.";

const GLOBALS = [
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
];

/** @type {{ object?: string, property: string, message: string }[]} */
const properties = [
  { property: "innerHTML", message: RAW_HTML },
  { property: "outerHTML", message: RAW_HTML },
  { property: "insertAdjacentHTML", message: RAW_HTML },
  { object: "navigator", property: "sendBeacon", message: MESSAGE },
  ...["window", "globalThis", "self"].flatMap((object) =>
    GLOBALS.map((property) => ({ object, property, message: MESSAGE })),
  ),
];

/** @type {import("eslint").Linter.Config[]} */
export const storage = [
  {
    files: ["apps/*/src/**", "packages/*/src/**"],
    ignores: [
      "packages/data/**",
      "packages/data-web/**",
      "apps/*/src/platform.ts",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        ...GLOBALS.map((name) => ({ name, message: MESSAGE })),
      ],
      "no-restricted-properties": ["error", ...properties],
    },
  },
];
