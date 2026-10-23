import { describe, expect, test } from "bun:test";
import { layerOf } from "../scripts/city-code-lib.js";
import {
  buildGraph,
  parseHistory,
  type Repo,
} from "../scripts/city-graph-lib.js";
import { board } from "../scripts/city-notices-lib.js";

// Round three: the walls and gates, the town hall and the asks. A made-up
// repo that goes over every wall once, beside a road that goes through.

const files: Record<string, string> = {
  "AGENTS.md": `## Rules, and what enforces each

- **Small files.** Under 150 lines. *(\`size:check\`)*
- **Nothing leaves the browser except through our own API.** No fetch (ADR 0025). *(ESLint)*
- **No mocks of our own code.** *(the owner reads it)*

## Stop and ask
`,
  "dependency-allowlist.json": JSON.stringify({
    dependencies: { react: {} },
  }),
  "packages/data/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts", "./write": "./src/write.ts" },
  }),
  "packages/data/src/index.ts": `import { rank } from "@cookto/engine";\nexport function read() {}\n`,
  "packages/data/src/write.ts": `import { useCase } from "@cookto/usecases";\nexport function save() {}\n`,
  "packages/data/src/network.ts": `export const send = (u) => fetch(u);\n`,
  "packages/usecases/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts" },
  }),
  "packages/usecases/src/index.ts": `import { save } from "@cookto/data/write";\nexport function useCase() {}\n`,
  "packages/engine/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts" },
  }),
  "packages/engine/src/index.ts": `import { read } from "@cookto/data";\nexport function rank() {}\n`,
  "packages/messenger/package.json": JSON.stringify({
    exports: { ".": "./src/index.ts" },
  }),
  "packages/messenger/src/index.ts": `export function send() {}\n`,
  "apps/api/src/index.ts": `import { send } from "@cookto/messenger";\nexport default {\n  fetch(request, env) {\n    return env.TELEGRAM_BOT_TOKEN;\n  },\n};\n`,
  "apps/web/src/features/home/useHome.ts": `import { useCase } from "@cookto/usecases";\nimport { save } from "@cookto/data/write";\nimport { send } from "@cookto/messenger";\nimport { usePantry } from "../pantry/usePantry.js";\nimport confetti from "confetti";\nimport { useState } from "react";\nexport function useHome() { return fetch("/x"); }\n`,
  "apps/web/src/features/pantry/usePantry.ts": `export function usePantry() { indexedDB.open("x"); }\n`,
  "apps/web/src/features/pantry/pantry.css": `.a { color: red; }\n`,
  "db/migrations/0001_one.up.sql": `create table a (id int);\nalter table a enable row level security;\n`,
  "db/migrations/0001_one.down.sql": `drop table a;\n`,
  "db/migrations/0002_two.up.sql": `create table b (id int);\n`,
};
const repo: Repo = {
  files: Object.keys(files),
  read: (p) => files[p] ?? "",
  history: parseHistory("@@a1|2026-01-01|feat: all\n"),
};
const theBoard = board(buildGraph(repo), repo);
/** What a test looks for, or a failure that names it. */
function must<T>(found: T | undefined, what: string): T {
  if (found === undefined) throw new Error(`No ${what}`);
  return found;
}
const gate = (id: string) =>
  must(
    theBoard.gates.find((g) => g.id === id),
    `gate ${id}`,
  );
const over = (id: string) => gate(id).over.map((i) => i.text);

describe("the port's own blocks", () => {
  test("the messenger, workflows and templates are no longer the engine", () => {
    expect(layerOf("packages/messenger/src/telegram.ts")).toEqual([
      "messenger",
      "messenger",
    ]);
    expect(layerOf("packages/workflows/src/run.ts")[0]).toBe("workflows");
    expect(layerOf("packages/templates/src/en.ts")).toEqual([
      "workflows",
      "templates",
    ]);
  });
});

describe("walls and gates", () => {
  test("a write that skips the use cases goes over the wall", () => {
    expect(over("write")).toEqual([
      "useHome → write: writes without a use case",
    ]);
    expect(gate("write").through).toEqual([
      [
        "apps/web/src/features/home/useHome.ts",
        "packages/usecases/src/index.ts",
      ],
    ]);
  });
  test("one feature reaching into another goes over the wall", () => {
    expect(over("trade")).toEqual([
      "useHome → usePantry: one feature reaches into another",
    ]);
  });
  test("a road back up the layers goes over the wall", () => {
    expect(over("oneway")).toEqual([
      "write → index: runs back up the layers",
      "index → index: runs back up the layers",
    ]);
  });
  test("CSS outside the kit, IndexedDB outside its adapter", () => {
    expect(over("kit")).toEqual([
      "apps/web/src/features/pantry/pantry.css: CSS outside the kit",
    ]);
    expect(over("phone")).toEqual(["usePantry opens IndexedDB itself"]);
  });
  test("customs stops a package that is not on the guest list", () => {
    expect(over("customs")).toEqual(["useHome brings in confetti"]);
    expect(gate("customs").today).toBe(
      "2 packages cross today: confetti, react.",
    );
  });
  test("only the port sends messages", () => {
    expect(over("send")).toEqual(["useHome → index: sends without the port"]);
    expect(gate("send").through).toEqual([
      ["apps/api/src/index.ts", "packages/messenger/src/index.ts"],
    ]);
  });
  test("a fetch outside the network files goes over; a Worker's handler doesn't", () => {
    expect(over("leave")).toEqual(["useHome calls fetch itself"]);
  });
  test("a migration needs its pair and row-level security", () => {
    expect(over("db")).toEqual([
      "db/migrations/0002_two.up.sql has no pair",
      "db/migrations/0002_two.up.sql makes a table without row-level security",
    ]);
  });
  test("the vault says where keys are read", () => {
    expect(gate("vault").today).toBe("Keys are read in 1 building: index.");
  });
  test("roads over a wall go on the board, first, each with its ADR", () => {
    expect(theBoard.notices[0]?.id).toBe("wall");
    expect(theBoard.notices[0]?.items[0]?.text).toBe(
      "ADR 0018, Customs: only the guest list ships: useHome brings in confetti",
    );
  });
});

describe("the town hall", () => {
  const rule = (start: string) =>
    must(
      theBoard.rules.find((r) => r.title.startsWith(start)),
      `rule ${start}`,
    );
  test("a rule about a place stands at its gate, and says if it's kept", () => {
    expect(rule("Nothing leaves").gate).toBe("leave");
    expect(rule("Nothing leaves").now).toEqual({
      state: "over",
      text: "1 over the wall",
    });
  });
  test("a rule no script checks says you read it", () => {
    expect(rule("No mocks").now).toEqual({ state: "you", text: "You read it" });
    expect(rule("Small files").now.state).toBe("guarded");
  });
});

describe("asks", () => {
  test("every item carries a sentence to hand on", () => {
    const wall = theBoard.notices.find((n) => n.id === "wall");
    expect(wall?.items[0]?.ask).toBe(
      "ADR 0018, Customs: only the guest list ships: useHome brings in confetti. Change the code so it goes through the gate instead, with no change in what the app does.",
    );
    const watch = theBoard.notices.find(
      (n) => n.kind === "watch" && n.items.length,
    );
    expect(watch?.items[0]?.ask).toStartWith("Take a look: ");
  });
});
