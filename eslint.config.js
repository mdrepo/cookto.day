import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import { bans } from "./tooling/scripts/eslint-bans.js";
import { layers } from "./tooling/scripts/eslint-layers.js";
import { server } from "./tooling/scripts/eslint-server.js";
import { storage } from "./tooling/scripts/eslint-storage.js";
import { RAW_HTML, syntax } from "./tooling/scripts/eslint-syntax.js";

// ADR 0007: typescript-eslint's strictTypeChecked preset, plus this repo's
// rules. Formatting is Prettier's job, so no formatting rules here.

export default defineConfig(
  {
    ignores: [
      "**/dist/",
      "**/test-results/",
      "**/playwright-report/",
      "**/.turbo/",
      // Build scratch: a build makes and deletes it while lint may be walking.
      "**/.build/",
    ],
  },
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Files outside the workspaces (this one) use the base settings.
          allowDefaultProject: ["eslint.config.js"],
          defaultProject: "tsconfig.base.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: RAW_HTML },
        { property: "outerHTML", message: RAW_HTML },
        { property: "insertAdjacentHTML", message: RAW_HTML },
      ],
      "no-eval": "error",
      "no-new-func": "error",
      // ts-ignore and ts-expect-error are both banned (AGENTS.md): fix the
      // type, or test a type with a conditional type that must hold.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true },
      ],
      // Numbers in template strings are harmless; other non-strings are not.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Code that ships: the apps and the packages they use (ADR 0016).
    files: ["apps/*/src/**", "packages/*/src/**"],
    rules: {
      // The app runs in people's browsers: no debug output left behind.
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Even in packages/data, no network yet: it comes with the network
      // adapter, and only there (ADR 0025). Elsewhere `storage` below bans it.
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "The network goes only through packages/data's network adapter, which doesn't exist yet (ADR 0025). Ask a code owner.",
        },
        {
          name: "XMLHttpRequest",
          message:
            "The network goes only through packages/data's network adapter, which doesn't exist yet (ADR 0025). Ask a code owner.",
        },
      ],
    },
  },
  // Banned code shapes, and React's rules (ADR 0003, 0018, 0023).
  ...syntax,
  // Only packages/data, and the file that hands it the browser's storage,
  // touch storage or the network (ADR 0024).
  ...storage,
  // The API calls out only from its AI adapter, and logs only through its
  // log helper (ADR 0028).
  ...server,
  {
    // A test file's describe() callback is long by nature.
    files: ["**/test/**", "**/e2e/**"],
    rules: { "max-lines-per-function": "off" },
  },
  // Each layer imports only what it may (ADR 0022).
  ...layers,
  // Dates in one place, and tests that use parts as people do.
  ...bans,
);
