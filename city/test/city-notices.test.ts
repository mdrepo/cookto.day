import { describe, expect, test } from "bun:test";
import { findCopies } from "../../tooling/scripts/copies-lib.js";
import { dishTwins, signs, twins } from "../scripts/city-dups-lib.js";
import {
  nearCap,
  permitGaps,
  rules,
  shelves,
  walkGaps,
  walks,
} from "../scripts/city-gaps-lib.js";
import {
  buildGraph,
  parseHistory,
  type Repo,
} from "../scripts/city-graph-lib.js";
import { board } from "../scripts/city-notices-lib.js";
import { abroad, guests, junctions } from "../scripts/city-watch-lib.js";

// The notice board: gaps, copies and the watch list the city posts. A
// made-up repo with one of each thing wrong, so each notice can be checked.

const SHARED = `export function same(a: number): number {
  const b = a + 1;
  const c = b * 2;
  const d = c - 3;
  const e = d / 4;
  const f = e + 5;
  return f;
}
`;
const files: Record<string, string> = {
  "AGENTS.md": `# AGENTS.md

## Rules, and what enforces each

- **Small files.** Keep them short. *(\`size:check\`)*
- **No mocks.** Test for real. *(the owner reads it; ESLint bans \`.only\`)*

## Stop and ask a human when
`,
  ".github/CODEOWNERS":
    "/packs/  @mdrepo\n/apps/web/src/platform.ts  @mdrepo\n",
  "dependency-allowlist.json": JSON.stringify({
    dependencies: { react: {} },
    devDependencies: {},
  }),
  "apps/web/src/i18n/en.ts": `export const en = {
  fridge: "Fridge",
  pantry: "Fridge",
  done: "Done",
  ok: "OK",
};
`,
  "apps/web/src/platform.ts": `import { useState } from "react";\nexport const settings = 1;\n`,
  "apps/web/src/features/home/HomeScreen.tsx": `import { useHome } from "./useHome.js";\n// specs/72-kitchen.md\nexport function HomeScreen() {}\n`,
  "apps/web/src/features/home/useHome.ts": `import { rank } from "@cookto/engine";\nimport { useStore } from "zustand";\nexport function useHome() {}\nexport function same() {}\n`,
  "apps/web/src/features/home/CookNow.tsx": `export function CookNow() {}\n`,
  "apps/web/src/features/pantry/Lost.tsx": `export function Lost() {}\n`,
  "apps/web/src/features/pantry/usePantry.ts": `export function same() {}\n`,
  "packages/engine/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts" },
  }),
  "packages/engine/src/index.ts": `export * from "./rank.js";\n`,
  "packages/engine/src/rank.ts": `export function rank() {}\n${"x\n".repeat(260)}`,
  "packages/engine/src/a.ts": SHARED,
  "packages/engine/src/b.ts": SHARED.replace("same", "other"),
  "specs/72-kitchen.md": "# Kitchen",
  "specs/99-orphan.md": "# Orphan",
  "apps/web/e2e/cook-now.spec.ts": `// specs/72-kitchen.md\ntest("a", () => {});\ntest.fail("b", () => {});\n`,
  "packs/north-indian/pack.json": "{}",
  "packs/north-indian/dishes/dal.json": JSON.stringify({
    ingredients: { lentils: {}, salt: {}, ghee: {} },
  }),
  "packs/north-indian/dishes/dal-fry.json": JSON.stringify({
    ingredients: { ghee: {}, salt: {}, lentils: {} },
  }),
  "packs/north-indian/dishes/ghost.json": JSON.stringify({
    ingredients: { unicorn: {}, salt: {} },
  }),
  "packs/ingredients/lentils.json": JSON.stringify({ label: "Lentils" }),
  "packs/ingredients/salt.json": JSON.stringify({ label: "Salt" }),
  "packs/ingredients/ghee.json": JSON.stringify({ label: "Ghee" }),
};
const repo: Repo = {
  files: Object.keys(files),
  read: (p) => files[p] ?? "",
  history: parseHistory("@@a1|2026-01-01|feat: all\n"),
};
const graph = buildGraph(repo);
const theBoard = board(graph, repo);
const notice = (id: string) =>
  theBoard.notices.find((n) => n.id === id)?.items ?? [];

describe("the statute book", () => {
  test("each rule, with its enforcer, and whether a script guards it", () => {
    expect(rules(files["AGENTS.md"] ?? "")).toEqual([
      {
        title: "Small files",
        enforced: "`size:check`",
        guarded: true,
        adrs: [],
      },
      {
        title: "No mocks",
        enforced: "the owner reads it; ESLint bans `.only`",
        guarded: false,
        adrs: [],
      },
    ]);
  });
  test("beats only the owner walks become a watch notice", () => {
    expect(notice("beat").map((i) => i.text)).toEqual([
      "No mocks: the owner reads it; ESLint bans `.only`",
    ]);
  });
});

describe("walks", () => {
  test("an e2e file: its name, specs, tests and known bugs", () => {
    expect(walks(repo)).toEqual([
      {
        file: "apps/web/e2e/cook-now.spec.ts",
        name: "cook now",
        specs: ["72"],
        tests: 2,
        bugs: 1,
      },
    ]);
  });
  test("a walk reaches a screen by spec or by name; the rest are gaps", () => {
    const home = graph.nodes.find((n) => n.label === "HomeScreen");
    const cookNow = graph.nodes.find((n) => n.label === "CookNow");
    expect(home?.info.walks).toEqual(["cook now"]);
    expect(cookNow?.info.walks).toEqual(["cook now"]);
    expect(walkGaps(graph.nodes).map((i) => i.text)).toEqual([
      "Lost cites no spec, and no walk is named after it",
    ]);
  });
  test("a spec no test cites is a permit without a walk", () => {
    expect(permitGaps(repo, graph.nodes)).toEqual([
      {
        text: "Spec 99, orphan: no test cites it, and no building does either",
        ids: [],
        file: "specs/99-orphan.md",
      },
    ]);
  });
});

describe("gaps on the map", () => {
  test("a dish needing a food no pack stocks", () => {
    expect(shelves(graph.nodes)).toEqual([
      {
        text: "ghost needs unicorn, which no warehouse stocks",
        ids: ["dish:north-indian/ghost"],
      },
    ]);
  });
  test("a file near or over its line limit", () => {
    expect(nearCap(graph.nodes).map((i) => i.text)).toEqual([
      "rank is at 262 of 300 lines",
    ]);
  });
});

describe("copies", () => {
  test("six tidy lines shared by two files, once per pair", () => {
    const found = findCopies([
      { path: "a.ts", text: SHARED },
      { path: "b.ts", text: SHARED.replace("same", "other") },
      { path: "c.ts", text: "export const x = 1;\n" },
    ]);
    expect(found).toEqual([
      { a: { file: "a.ts", at: 2 }, b: { file: "b.ts", at: 2 } },
    ]);
    expect(notice("copy").map((i) => i.ids)).toEqual([
      ["packages/engine/src/a.ts", "packages/engine/src/b.ts"],
    ]);
  });
  test("twins: one name declared in two buildings", () => {
    expect(twins(graph.nodes).map((i) => i.text)).toEqual([
      "same() is declared in 3 buildings",
    ]);
  });
  test("one sign under two keys", () => {
    expect(signs(files["apps/web/src/i18n/en.ts"] ?? "", "en.ts")).toEqual([
      {
        text: "“Fridge” is said under 2 keys: fridge, pantry",
        file: "en.ts",
        line: 2,
      },
    ]);
  });
  test("two dishes with the same ingredients", () => {
    expect(dishTwins(graph.nodes).map((i) => i.text)).toEqual([
      "dal and dal-fry use the same ingredients",
    ]);
  });
});

describe("the watch list", () => {
  test("goods from abroad, against the guest list", () => {
    expect(
      abroad(files["apps/web/src/features/home/useHome.ts"] ?? ""),
    ).toEqual(["zustand"]);
    expect(
      guests(graph.nodes, files["dependency-allowlist.json"] ?? "{}"),
    ).toEqual([
      { text: "react: 1 building", ids: ["apps/web/src/platform.ts"] },
      {
        text: "zustand: 1 building (not on the guest list)",
        ids: ["apps/web/src/features/home/useHome.ts"],
      },
    ]);
  });
  test("junctions: what reaches the most screens", () => {
    expect(junctions(graph.nodes, graph.edges, 1)).toEqual([
      {
        text: "rank reaches 1 screen through 3 buildings",
        ids: ["packages/engine/src/rank.ts"],
      },
    ]);
  });
  test("listed buildings carry the owner's seal", () => {
    const listed = graph.nodes.filter((n) => n.info.listed).map((n) => n.id);
    expect(listed).toContain("apps/web/src/platform.ts");
    expect(listed).toContain("dish:north-indian/dal");
    expect(listed).not.toContain("packages/engine/src/rank.ts");
  });
});
