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

const ROLE =
  "A role on the app's own markup is a hand-made part (ADR 0019). Use the kit's part (Reminders, Reasons, Choice, ...), or add the part to @cookto/ui with its design row, kit page and tests.";

// Screens written before this rule: each file leaves the list when it moves
// to a kit part, and none joins it. Keep it shrinking.
const SCREENS_WITH_ROLES = [
  "apps/web/src/features/onboarding/PersonCard.tsx",
  "apps/web/src/features/pantry/TapBought.tsx",
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
  {
    // The app's screens compose the kit's parts; they don't make their own.
    files: ["apps/web/src/**/*.tsx"],
    ignores: SCREENS_WITH_ROLES,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...inReact,
        { selector: "JSXAttribute[name.name='role']", message: ROLE },
      ],
    },
  },
];
