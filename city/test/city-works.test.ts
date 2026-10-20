import { describe, expect, test } from "bun:test";
import {
  adrs,
  citedAdrs,
  proposals,
  uncited,
} from "../scripts/city-book-lib.js";
import {
  buildGraph,
  packageExports,
  parseHistory,
  type Repo,
} from "../scripts/city-graph-lib.js";
import { board } from "../scripts/city-notices-lib.js";
import { routesOpened, wayIn, wordKeys } from "../scripts/city-screens-lib.js";
import {
  deadEnds,
  importedNames,
  onlyInspectors,
  topicOf,
  topics,
  trespasses,
  uninspected,
} from "../scripts/city-works-lib.js";

// Round two of the notice board: the works nobody inspects, doors cut for
// the inspectors, dead ends, the facade's doors, topics, the statute book's
// decisions, and screens as the way in. A made-up repo with one of each.

const files: Record<string, string> = {
  "AGENTS.md": `## Rules, and what enforces each

- **Rules live in their layer.** Keep them in the engine (ADR 0022). *(the layer lint rules)*

## Stop and ask
`,
  "docs/adr/0001-record.md":
    "# 0001. Record decisions\n\n- **Status:** Accepted\n",
  "docs/adr/0022-layers.md":
    "# 0022. Split the app into layers\n\n- **Status:** Accepted\n\nBuilds on [0001](0001-record.md).\n",
  "docs/adr/0030-secrets.md":
    "# 0030. Secrets\n\n- **Status:** Superseded by ADR 0031\n",
  "docs/adr/0031-vault.md": "# 0031. The vault\n\n- **Status:** Accepted\n",
  "docs/adr/0040-forgotten.md": "# 0040. Forgotten\n\n- **Status:** Accepted\n",
  "docs/proposals/bills-by-post.md":
    "# Proposal: bills by post\n\n- **Status:** Proposed, for Mayur to decide\n",
  "packages/engine/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts", "./time": "./src/time.ts" },
  }),
  "packages/engine/src/index.ts": `export * from "./rank.js";\n`,
  "packages/engine/src/rank.ts": `export function rank() {}\nexport function helper() {}\n`,
  "packages/engine/src/time.ts": `export function today() {}\n`,
  "packages/engine/src/lonely.ts": `export function lonely() {}\n`,
  "packages/engine/test/rank.test.ts": `import { rank, helper } from "../src/rank.js";\n`,
  "packages/engine/test/time-zones.test.ts": `import { today } from "../src/time.js";\n`,
  "apps/web/src/i18n/en.ts": "",
  "apps/web/src/features/home/HomeScreen.tsx": `import { rank } from "@cookto/engine";\nimport { today } from "../../../../../packages/engine/src/time.js";\nimport { useHome } from "./useHome.js";\nexport function HomeScreen() { return t.title; }\n`,
  "apps/web/src/features/home/useHome.ts": `import { rank } from "@cookto/engine";\nexport function useHome() { open("pantry"); return [t.title, t.count, t.missing]; }\n`,
  "apps/web/src/features/pantry/PantryScreen.tsx": `export function PantryScreen() {}\n`,
  "apps/web/src/features/pantry/usePantry.ts": `export function usePantry() {}\n`,
};
const repo: Repo = {
  files: Object.keys(files),
  read: (p) => files[p] ?? "",
  history: parseHistory("@@a1|2026-01-01|feat: all\n"),
};
const en = { title: "Today", count: { one: "{n} meal", other: "{n} meals" } };
const graph = buildGraph(repo);
const theBoard = board(graph, repo, en);
const node = (label: string) => graph.nodes.find((n) => n.label === label);
const notice = (id: string) =>
  theBoard.notices.find((n) => n.id === id)?.items ?? [];

describe("the works", () => {
  test("a file with no test file of its own; a prefix or suffix counts", () => {
    expect(uninspected(graph.nodes, repo.files).map((i) => i.text)).toEqual([
      "lonely has no test file of its own in packages/engine/test",
    ]);
  });
  test("names a file imports, by name, including re-exports", () => {
    expect(
      importedNames(
        `import { a, b as c } from "x";\nimport d from "y";\nexport { e } from "z";\nimport type { T } from "t";`,
      ),
    ).toEqual(["a", "b", "e", "T", "d"]);
  });
  test("an export only tests import is offered only to the inspectors", () => {
    expect(onlyInspectors(graph.nodes, repo).map((i) => i.text)).toEqual([
      "rank exports helper for tests only",
    ]);
  });
  test("a building with no roads is a dead end", () => {
    expect(deadEnds(graph.nodes, graph.edges).map((i) => i.text)).toEqual([
      "lonely has no roads in or out",
      "PantryScreen has no roads in or out",
      "usePantry has no roads in or out",
    ]);
  });
});

describe("the facade", () => {
  test("a package's doors are the files its exports name", () => {
    const doors = packageExports(repo);
    expect(doors).toEqual({
      "@cookto/engine": "packages/engine/src/index.ts",
      "@cookto/engine/time": "packages/engine/src/time.ts",
    });
    expect(node("index")?.info.door).toEqual(["@cookto/engine"]);
    expect(node("rank")?.info.door).toBeUndefined();
  });
  test("a road from outside that skips the doors is a trespass", () => {
    const doors = { "@cookto/engine": "packages/engine/src/index.ts" };
    expect(
      trespasses(graph.nodes, graph.edges, doors).map((i) => i.text),
    ).toEqual(["HomeScreen enters engine at time, not through a door"]);
    expect(notice("door")).toEqual([]);
  });
});

describe("topics", () => {
  test("a building's topic drops use, Screen and hyphens", () => {
    expect(topicOf("useCookToday")).toBe("cooktoday");
    expect(topicOf("CookToday")).toBe("cooktoday");
    expect(topicOf("cook-today")).toBe("cooktoday");
    expect(topicOf("PantryScreen")).toBe("pantry");
  });
  test("one name through two or more layers", () => {
    expect(topics(graph.nodes)).toEqual([
      {
        name: "home",
        ids: [
          "apps/web/src/features/home/HomeScreen.tsx",
          "apps/web/src/features/home/useHome.ts",
        ],
        layers: ["screens", "hooks"],
      },
      {
        name: "pantry",
        ids: [
          "apps/web/src/features/pantry/PantryScreen.tsx",
          "apps/web/src/features/pantry/usePantry.ts",
        ],
        layers: ["screens", "hooks"],
      },
    ]);
  });
});

describe("the statute book", () => {
  test("ADR numbers cited in prose, lists, paths and links", () => {
    expect(
      citedAdrs(
        "see ADR 0022 and ADRs 0005, 0006 and 0007; docs/adr/0010-x.md; [0019](0019-kit.md)",
      ),
    ).toEqual(["0005", "0006", "0007", "0010", "0019", "0022"]);
  });
  test("every ADR with its title, status and what it rests on", () => {
    expect(adrs(repo).map((a) => [a.n, a.title, a.status, a.cites])).toEqual([
      ["0001", "Record decisions", "Accepted", []],
      ["0022", "Split the app into layers", "Accepted", ["0001"]],
      ["0030", "Secrets", "Superseded", ["0031"]],
      ["0031", "The vault", "Accepted", []],
      ["0040", "Forgotten", "Accepted", []],
    ]);
    expect(theBoard.rules[0]?.adrs).toEqual(["0022"]);
  });
  test("an accepted ADR nothing cites", () => {
    expect(uncited(adrs(repo), graph.nodes, repo).map((i) => i.text)).toEqual([
      "ADR 0040, Forgotten: nothing cites it",
    ]);
  });
  test("proposals are planning applications", () => {
    expect(proposals(repo)).toEqual([
      {
        file: "docs/proposals/bills-by-post.md",
        title: "bills by post",
        status: "Proposed, for Mayur to decide",
      },
    ]);
  });
});

describe("screens as the way in", () => {
  test("the words a file uses, and the routes it opens", () => {
    expect(wordKeys(`t.title + t.count + t.title`)).toEqual(["title", "count"]);
    expect(routesOpened(`open("pantry"); go("who"); open("pantry")`)).toEqual([
      "pantry",
      "who",
    ]);
  });
  test("a screen's words come from it and its hooks, in English; a plural takes its other form", () => {
    wayIn(graph.nodes, graph.edges, repo, en);
    expect(node("HomeScreen")?.info.words).toEqual([
      { k: "title", text: "Today" },
      { k: "count", text: "{n} meals" },
    ]);
    expect(node("HomeScreen")?.info.leads).toEqual([
      "apps/web/src/features/pantry/PantryScreen.tsx",
    ]);
    expect(node("PantryScreen")?.info.words).toBeUndefined();
  });
});
