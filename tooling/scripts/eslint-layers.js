// ADR 0022: each layer imports only what it may, and the error says where the
// code belongs instead. ESLint's own no-restricted-imports, no plugin.
//
// A file gets one no-restricted-imports setting (a later block replaces an
// earlier one), so the blocks below never overlap: each lists every rule for
// the files it matches.

const ADR = "(ADR 0022)";

const SCREEN = `A screen draws what its hook gives it ${ADR}. Read data, or call a use case, in a use*.ts hook beside it.`;
const WRITE = `Writes go through a use case ${ADR}. Call one from @cookto/usecases; only packages/usecases imports @cookto/data/write.`;
const FEATURE = `Features don't import each other ${ADR}: what two features share moves down a layer, to a use case, the engine, data or the kit.`;
const MESSENGER = `Only the API sends messages (ADR 0031): the app talks to our API, never to a messaging service.`;
/** @param {string} layer */
const noReact = (layer) =>
  `${layer} runs without React, so it's tested without a browser and reused by another app ${ADR}. Move this into a screen hook.`;
/** @param {string} layer @param {string} may */
const below = (layer, may) => `${layer} may import ${may} only ${ADR}.`;

/** React, and the libraries that need it. */
const REACT =
  "^(react(-dom)?(/.*)?|@tanstack/react-.*|zustand(/(react|shallow|traditional))?|@cookto/ui(/.*)?)$";

/**
 * @param {string} regex
 * @param {string} message
 */
const ban = (regex, message) => ({ regex, message });

/**
 * One block's import rule.
 * @param {{ regex: string, message: string }[]} patterns
 * @returns {import("eslint").Linter.RulesRecord}
 */
const rules = (patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

/**
 * Leaving the feature: from a file `depth` folders inside it, a relative
 * import that climbs exactly to `features/` and goes down into another one.
 * @param {number} depth
 */
const otherFeature = (depth) =>
  ban(`^${"\\.\\./".repeat(depth)}[^./]`, FEATURE);

const FEATURES = "apps/*/src/features";
const DEPTHS = [1, 2, 3];

/** @type {import("eslint").Linter.Config[]} */
export const layers = [
  {
    // Everything not named below: the kit, tooling, the apps' tops, tests.
    // The tests of use cases, data and the engine have no layer rule: they
    // use fakes, writers and @cookto/testing as they need.
    files: ["**/*.{ts,tsx,js}"],
    ignores: [
      "packages/usecases/**",
      "packages/data/**",
      "packages/engine/**",
      "packages/messenger/**",
      "apps/api/**",
      `${FEATURES}/**`,
    ],
    rules: rules([
      ban("^@cookto/data/write$", WRITE),
      ban("^@cookto/messenger(/.*)?$", MESSENGER),
    ]),
  },
  {
    // The API: the one place that sends messages (ADR 0031).
    files: ["apps/api/**"],
    rules: rules([ban("^@cookto/data/write$", WRITE)]),
  },
  ...DEPTHS.flatMap((depth) => {
    const inside = `${FEATURES}/*/${"*/".repeat(depth - 1)}`;
    return [
      {
        files: [`${inside}*.tsx`],
        rules: rules([
          ban(
            "^(@cookto/(data|usecases)(/.*)?|zustand(/.*)?|@tanstack/.*)$",
            SCREEN,
          ),
          ban("^@cookto/messenger(/.*)?$", MESSENGER),
          otherFeature(depth),
        ]),
      },
      {
        files: [`${inside}*.ts`],
        rules: rules([
          ban("^@cookto/data/write$", WRITE),
          ban("^@cookto/messenger(/.*)?$", MESSENGER),
          otherFeature(depth),
        ]),
      },
    ];
  }),
  {
    files: ["packages/usecases/src/**"],
    rules: rules([
      ban(REACT, noReact("A use case")),
      ban(
        "^@cookto/(?!engine$|data(/.*)?$|ui($|/)|usecases($|/))",
        below("A use case", "@cookto/engine, @cookto/data and other use cases"),
      ),
    ]),
  },
  {
    files: ["packages/data/src/**"],
    rules: rules([
      ban(REACT, noReact("Data")),
      ban("^@cookto/(?!engine$|ui($|/))", below("Data", "@cookto/engine")),
    ]),
  },
  {
    files: ["packages/engine/src/**"],
    rules: rules([
      ban(REACT, noReact("The engine")),
      ban("^@cookto/(?!ui($|/))", below("The engine", "nothing else of ours")),
    ]),
  },
  {
    // The messenger knows no plan, cook or household (ADR 0031).
    files: ["packages/messenger/src/**"],
    rules: rules([
      ban(REACT, noReact("The messenger")),
      ban("^@cookto/", below("The messenger", "nothing of ours")),
    ]),
  },
];
