import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// ADR 0007: typescript-eslint's strictTypeChecked preset, plus this repo's
// rules. Formatting is Prettier's job, so no formatting rules here.

const TEST_FOCUS =
  "Committed .only/.skip silently drops tests (ADR 0003). Track a known bug with test.fail() and an issue instead.";
const RAW_HTML =
  "Raw HTML is an XSS risk, and bills are untrusted input. Use textContent or createElement.";

export default defineConfig(
  {
    ignores: [
      "**/dist/",
      "**/test-results/",
      "**/playwright-report/",
      "**/.turbo/",
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
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^(only|skip)$/][object.name=/^(test|describe|it)$/]",
          message: TEST_FOCUS,
        },
        {
          selector:
            "MemberExpression[property.name=/^(only|skip)$/][object.property.name='describe']",
          message: TEST_FOCUS,
        },
      ],
      // ts-ignore comments are banned; ts-expect-error must say why.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
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
      // Data stays in the browser (ADR 0013). Network calls need a new ADR.
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "cookto.day sends nothing over the network (ADR 0013). Ask a code owner.",
        },
        {
          name: "XMLHttpRequest",
          message:
            "cookto.day sends nothing over the network (ADR 0013). Ask a code owner.",
        },
      ],
    },
  },
  {
    // A test file's describe() callback is long by nature.
    files: ["**/test/**", "**/e2e/**"],
    rules: { "max-lines-per-function": "off" },
  },
);
