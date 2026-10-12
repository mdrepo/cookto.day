import reactHooks from "eslint-plugin-react-hooks";

// Code shapes this repo bans, and React's own rules, used by eslint.config.js.
//
// A file gets one no-restricted-syntax setting (a later block replaces an
// earlier one), so the React block repeats every general ban: before #48 it
// didn't, and a committed .only in a .tsx test went unseen.

export const RAW_HTML =
  "Raw HTML is an XSS risk, and bills are untrusted input. Render text with JSX, or use textContent.";
const TEST_FOCUS =
  "Committed .only/.skip silently drops tests (ADR 0003). Track a known bug with test.fail() and an issue instead.";
const MEMO =
  "React Compiler memoises for you (ADR 0023), so plain code is enough. If one is really needed, disable this line with a reason: // eslint-disable-next-line no-restricted-syntax -- why";

/** @typedef {{ selector: string, message: string }} Ban */

/** @type {Ban[]} */
const everywhere = [
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
  {
    selector:
      "CallExpression[callee.name=/^(useMemo|useCallback|memo)$/], CallExpression[callee.object.name='React'][callee.property.name=/^(useMemo|useCallback|memo)$/]",
    message: MEMO,
  },
];

/** @type {Ban[]} */
const inReact = [
  ...everywhere,
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: RAW_HTML,
  },
  {
    selector:
      "ClassDeclaration[superClass.name=/^(Pure)?Component$/], ClassDeclaration[superClass.property.name=/^(Pure)?Component$/]",
    message: "Write a function component with hooks (ADR 0018), not a class.",
  },
];

/** @type {import("eslint").Linter.Config[]} */
export const syntax = [
  {
    files: ["**/*.{ts,tsx,js}"],
    rules: { "no-restricted-syntax": ["error", ...everywhere] },
  },
  {
    // React (ADR 0018, 0023): function components and hooks only, by the
    // rules, including React Compiler's. Hooks live in .ts files too.
    files: ["**/*.tsx", "apps/*/src/**/*.ts"],
    // The plugin's own types are older than ESLint 10's Plugin type; it works.
    plugins: {
      "react-hooks": /** @type {import("eslint").ESLint.Plugin} */ (
        /** @type {unknown} */ (reactHooks)
      ),
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-syntax": ["error", ...inReact],
    },
  },
];
