import { describe, expect, test } from "bun:test";
import {
  declarations,
  isCode,
  layerOf,
  resolveImport,
  shortPath,
} from "../scripts/city-code-lib.js";
import { buildGraph, parseHistory } from "../scripts/city-graph-lib.js";

// bun run city draws every file as a building, with its functions and the
// roads between them. These check the graph the page reads is right.

describe("which files are buildings, and where they stand", () => {
  test("hand-written code in an app's or a package's src/", () => {
    expect(isCode("apps/web/src/features/home/HomeScreen.tsx")).toBe(true);
    expect(isCode("packages/engine/src/expiry.ts")).toBe(true);
    expect(isCode("apps/web/src/i18n/en.ts")).toBe(false);
    expect(isCode("packages/data/src/packs/north-indian.steps.ts")).toBe(false);
    expect(isCode("apps/web/src/css.d.ts")).toBe(false);
    expect(isCode("apps/web/test/dom/home.test.ts")).toBe(false);
  });

  test("a feature's screens and hooks, and the other districts", () => {
    expect(layerOf("apps/web/src/features/pantry/AddFood.tsx")).toEqual([
      "screens",
      "pantry",
    ]);
    expect(layerOf("apps/web/src/features/pantry/useAddFood.ts")).toEqual([
      "hooks",
      "pantry",
    ]);
    expect(layerOf("apps/web/src/features/pantry/units.ts")).toEqual([
      "hooks",
      "pantry",
    ]);
    expect(layerOf("apps/web/src/app.tsx")).toEqual(["screens", "app shell"]);
    expect(layerOf("apps/api/src/receipts/photo.ts")).toEqual([
      "api",
      "receipts",
    ]);
    expect(layerOf("apps/api/src/router.ts")).toEqual(["api", "worker"]);
    expect(layerOf("packages/ui/src/components/Button/Button.tsx")).toEqual([
      "ui",
      "components",
    ]);
    expect(layerOf("packages/data/src/packs/catalog.ts")).toEqual([
      "packs",
      "bundles",
    ]);
    expect(layerOf("packages/data-web/src/index.ts")).toEqual([
      "data",
      "IndexedDB adapter",
    ]);
    expect(layerOf("packages/usecases/src/pantry.ts")).toEqual([
      "usecases",
      "use cases",
    ]);
    expect(layerOf("packages/engine/src/expiry.ts")).toEqual([
      "engine",
      "engine",
    ]);
  });

  test("paths read short", () => {
    expect(shortPath("apps/web/src/features/pantry/AddFood.tsx")).toBe(
      "pantry/AddFood.tsx",
    );
    expect(shortPath("packages/engine/src/expiry.ts")).toBe("engine/expiry.ts");
    expect(shortPath("apps/api/src/router.ts")).toBe("api/router.ts");
  });
});

describe("what a file declares", () => {
  const src = `import { x } from "./x.js";

/** The day \`daysAgo\` days before today. */
const before = (daysAgo: number) => addDays(today(), -daysAgo);

/**
 * Adding food: tapping what's fresh (specs/113), or
 * typing a name (specs/72).
 */
export function useAddFood(onDone: () => void) {
  function inner() {}
  return onDone;
}

export default function AddFood() {}
export class Store {}
export { addDays, type Day, daysLeft as left } from "./expiry.js";
export * from "./needs.js";
`;

  test("functions, hooks, components, values and classes, with their comments", () => {
    const found = declarations(src);
    expect(found.map((d) => [d.name, d.kind, d.exported, d.line])).toEqual([
      ["before", "value", false, 4],
      ["useAddFood", "hook", true, 10],
      ["AddFood", "component", true, 15],
      ["Store", "class", true, 16],
      ["addDays", "re-export", true, 17],
      ["daysLeft", "re-export", true, 17],
      ["everything from ./needs", "re-export", true, 18],
    ]);
    expect(found[0]?.doc).toBe("The day `daysAgo` days before today.");
    expect(found[1]?.doc).toBe(
      "Adding food: tapping what's fresh (specs/113), or typing a name (specs/72).",
    );
    // Nested functions aren't the file's own declarations.
    expect(found.some((d) => d.name === "inner")).toBe(false);
  });

  test("a comment belongs only to the line right after it", () => {
    const found = declarations(
      `/** Lost. */\nimport { a } from "./a.js";\nconst b = 1;\n`,
    );
    expect(found).toEqual([
      { name: "b", doc: "", exported: false, line: 3, kind: "value" },
    ]);
  });
});

describe("where an import points", () => {
  const exists = (p: string) =>
    [
      "apps/web/src/food.ts",
      "apps/web/src/features/pantry/units.ts",
      "packages/engine/src/index.ts",
    ].includes(p);
  const pkg = { "@cookto/engine": "packages/engine/src/index.ts" };

  test("a relative import, with or without its .js ending", () => {
    expect(
      resolveImport(
        "apps/web/src/features/pantry/useAddFood.ts",
        "./units.js",
        exists,
        pkg,
      ),
    ).toBe("apps/web/src/features/pantry/units.ts");
    expect(
      resolveImport(
        "apps/web/src/features/pantry/useAddFood.ts",
        "../../food.js",
        exists,
        pkg,
      ),
    ).toBe("apps/web/src/food.ts");
  });

  test("a workspace package by its exported name; outside packages point nowhere", () => {
    expect(
      resolveImport("apps/web/src/food.ts", "@cookto/engine", exists, pkg),
    ).toBe("packages/engine/src/index.ts");
    expect(
      resolveImport("apps/web/src/food.ts", "react", exists, pkg),
    ).toBeUndefined();
  });
});

describe("the graph of a small repo", () => {
  const log = [
    "@@a1|2026-10-10|chore: start",
    "A\tpackages/engine/src/index.ts",
    "A\tpackages/engine/package.json",
    "",
    "@@b2|2026-10-12|feat: #72 the fridge",
    "A\tapps/web/src/features/pantry/PantryScreen.tsx",
    "A\tapps/web/src/features/pantry/usePantry.ts",
    "M\tpackages/engine/src/index.ts",
    "A\tpacks/our-kitchen/pack.json",
    "A\tpacks/our-kitchen/dishes/poha.json",
    "A\tpacks/ingredients/onion.json",
    "",
  ].join("\n");
  const sources: Record<string, string> = {
    "packages/engine/package.json": '{"exports":{".":"./src/index.ts"}}',
    "packages/engine/src/index.ts":
      "/** Days left. */\nexport function daysLeft() {}\n",
    "apps/web/src/features/pantry/PantryScreen.tsx":
      'import { usePantry } from "./usePantry.js";\nexport function PantryScreen() {}\n',
    "apps/web/src/features/pantry/usePantry.ts":
      'import { daysLeft } from "@cookto/engine";\nimport { t } from "../../i18n/en.js";\n/** The fridge (specs/72). */\nexport function usePantry() {}\n',
    "packs/our-kitchen/pack.json": "{}",
    "packs/our-kitchen/words/en.json": '{"dishes":{"poha":"Poha"}}',
    "packs/our-kitchen/dishes/poha.json":
      '{"slots":["breakfast"],"ingredients":{"onion":{},"poha":{}},"servedWith":["chai"],"steps":["a","b"]}',
    "packs/our-kitchen/dishes/chai.json": '{"ingredients":{}}',
    "packs/ingredients/onion.json":
      '{"wikidata":"Q1","keeps":{"days":14,"in":"cupboard"},"names":[{"text":"Onion","lang":"en"},{"text":"प्याज़","lang":"hi"}]}',
    "specs/72-kitchen.md": "# The kitchen",
  };
  const history = parseHistory(log);
  const graph = buildGraph({
    files: Object.keys(sources),
    read: (f) => sources[f] ?? "",
    history,
  });
  const node = (id: string) => graph.nodes.find((n) => n.id === id);

  test("git history: when each file came, last changed, and how often", () => {
    expect(history.commits.map((c) => c.h)).toEqual(["a1", "b2"]);
    expect(history.added.get("packages/engine/src/index.ts")).toBe(0);
    expect(history.last.get("packages/engine/src/index.ts")).toBe(1);
    expect(history.churn.get("packages/engine/src/index.ts")).toBe(2);
    expect(history.added.get("packs/ingredients/onion.json")).toBe(1);
  });

  test("a building per code file, dish and food", () => {
    expect(graph.nodes.map((n) => n.id).sort()).toEqual([
      "apps/web/src/features/pantry/PantryScreen.tsx",
      "apps/web/src/features/pantry/usePantry.ts",
      "dish:our-kitchen/chai",
      "dish:our-kitchen/poha",
      "ing:onion",
      "packages/engine/src/index.ts",
    ]);
    expect(node("dish:our-kitchen/poha")).toMatchObject({
      label: "Poha",
      layer: "dishes",
      group: "our-kitchen",
      lines: 2,
      added: 1,
      info: { ingredients: 2, steps: 2, slots: ["breakfast"] },
    });
    expect(node("ing:onion")).toMatchObject({
      label: "Onion",
      layer: "ingredients",
      info: { keeps: "14 days in the cupboard", hi: "प्याज़" },
    });
    expect(
      node("apps/web/src/features/pantry/usePantry.ts")?.info,
    ).toMatchObject({
      path: "pantry/usePantry.ts",
      specs: [{ n: "72", file: "specs/72-kitchen.md" }],
    });
  });

  test("roads: imports (not i18n), recipes, and a side served with a dish", () => {
    expect(graph.edges).toEqual([
      {
        s: "apps/web/src/features/pantry/PantryScreen.tsx",
        t: "apps/web/src/features/pantry/usePantry.ts",
        k: "import",
      },
      {
        s: "apps/web/src/features/pantry/usePantry.ts",
        t: "packages/engine/src/index.ts",
        k: "import",
      },
      { s: "dish:our-kitchen/poha", t: "ing:onion", k: "recipe" },
      { s: "dish:our-kitchen/poha", t: "dish:our-kitchen/chai", k: "served" },
    ]);
  });
});
