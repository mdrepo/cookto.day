import { describe, expect, test } from "bun:test";
import {
  buildMap,
  decodeMappings,
  type E2eMap,
  lookup,
} from "../scripts/e2e-map-lib.js";
import { changedLines, selectSpecs } from "../scripts/e2e-select-lib.js";

// The smart pre-push (agreed 24 Oct): the e2e map from the deploy's
// coverage, and the specs a push needs from it.

describe("source maps", () => {
  // Line 1: columns 0 and 4 from source 0's line 1, columns 0 and 4.
  // Line 2: column 0 from source 0's line 2, column 4.
  const lines = decodeMappings("AAAA,IAAI;AACA");

  test("each generated column, to its source line", () => {
    expect(lookup(lines, 0, 5)).toEqual({ source: 0, line: 1 });
    expect(lookup(lines, 1, 0)).toEqual({ source: 0, line: 2 });
  });

  test("before the first mapping, or past the last line: nothing", () => {
    expect(lookup(decodeMappings("EAAA"), 0, 0)).toBeNull();
    expect(lookup(lines, 5, 0)).toBeNull();
  });
});

describe("building the map", () => {
  // Two functions, one per line: a.ts line 11, b.ts line 21 (D = -1, U = 10).
  const code = "function a(){}\nfunction b(){}";
  const script = {
    code,
    sources: ["../src/a.ts", "../src/b.ts", "../../node_modules/react.js"],
    mappings: "AAUA;ACUA",
  };
  const inRepo = (s: string) =>
    s.includes("node_modules") ? null : `apps/web/${s.slice(3)}`;

  test("each function the test ran, by file and lines, with its spec", () => {
    const map = buildMap(
      [
        { spec: "apps/web/e2e/a.spec.ts", scripts: { "x.js": [[0, 14]] } },
        {
          spec: "apps/web/e2e/b.spec.ts",
          scripts: {
            "x.js": [
              [0, 14],
              [15, 29],
            ],
          },
        },
      ],
      (name) => (name === "x.js" ? script : null),
      inRepo,
      "abc",
    );
    expect(map).toEqual({
      commit: "abc",
      specs: ["apps/web/e2e/a.spec.ts", "apps/web/e2e/b.spec.ts"],
      files: {
        "apps/web/src/a.ts": [[11, 11, [0, 1]]],
        "apps/web/src/b.ts": [[21, 21, [1]]],
      },
    });
  });

  test("a wrapper across two sources, and scripts without a map, are left out", () => {
    const map = buildMap(
      [{ spec: "s", scripts: { "x.js": [[0, 29]], "y.js": [[0, 5]] } }],
      (name) => (name === "x.js" ? script : null),
      inRepo,
      "abc",
    );
    expect(map.files).toEqual({});
  });
});

const SPECS = ["a", "b", "c", "d", "e", "f"].map(
  (s) => `apps/web/e2e/${s}.spec.ts`,
);
const MAP: E2eMap = {
  commit: "abc",
  specs: SPECS,
  files: {
    "apps/web/src/features/home/useHome.ts": [
      [10, 20, [0]],
      [30, 40, [1]],
    ],
    "packages/ui/src/components/Card/Card.tsx": [[5, 9, [2]]],
  },
};
const IMPORTS: Record<string, string[]> = {
  "packages/engine/src/new.ts": ["packages/engine/src/index.ts"],
  "packages/engine/src/index.ts": ["apps/web/src/features/home/useHome.ts"],
};
const push = (fresh: string[], lines = {}, specs = SPECS) =>
  selectSpecs({
    fresh,
    lines,
    map: MAP,
    specs,
    importers: (f) => IMPORTS[f] ?? [],
  });
const HOME = "apps/web/src/features/home/useHome.ts";

describe("choosing the specs", () => {
  test("a change inside a function: the specs that ran it", () => {
    expect(push([HOME], { [HOME]: [[12, 13]] })).toEqual({
      all: false,
      specs: ["apps/web/e2e/a.spec.ts"],
    });
  });

  test("a change outside every function: every spec that ran the file", () => {
    expect(push([HOME], { [HOME]: [[1, 2]] })).toEqual({
      all: false,
      specs: ["apps/web/e2e/a.spec.ts", "apps/web/e2e/b.spec.ts"],
    });
  });

  test("a new file: the specs of the nearest mapped file importing it", () => {
    expect(push(["packages/engine/src/new.ts"])).toEqual({
      all: false,
      specs: ["apps/web/e2e/a.spec.ts", "apps/web/e2e/b.spec.ts"],
    });
  });

  test("a file the page never loads, the API or the database: none", () => {
    expect(
      push(["packages/engine/src/alone.ts", "apps/api/src/x.ts", "db/x.sql"]),
    ).toEqual({ all: false, specs: [] });
  });

  test("a changed spec runs; a component's styles run the specs showing it", () => {
    expect(
      push([
        "apps/web/e2e/f.spec.ts",
        "packages/ui/src/components/Card/Card.module.css",
      ]),
    ).toEqual({
      all: false,
      specs: ["apps/web/e2e/c.spec.ts", "apps/web/e2e/f.spec.ts"],
    });
  });

  test("a spec the map has no record of always runs", () => {
    expect(push([], {}, [...SPECS, "apps/web/e2e/new.spec.ts"])).toEqual({
      all: false,
      specs: ["apps/web/e2e/new.spec.ts"],
    });
  });

  test("what every page loads, or the e2e helpers: everything", () => {
    for (const file of [
      "apps/web/src/index.html",
      "apps/web/e2e/support/kitchen.ts",
      "packages/ui/tokens/colour.json",
      "packages/ui/src/global.css",
      "bun.lock",
      "apps/web/scripts/build.ts",
    ])
      expect(push([file])).toMatchObject({ all: true });
  });

  test("when most specs would run: everything", () => {
    expect(
      push(SPECS.slice(0, 5).concat("apps/web/e2e/f.spec.ts")),
    ).toMatchObject({ all: true });
  });
});

describe("changed lines", () => {
  test("each hunk on the old side; an addition is the line it follows", () => {
    const diff = [
      "diff --git a/x.ts b/x.ts",
      "--- a/x.ts",
      "+++ b/x.ts",
      "@@ -3,2 +3,4 @@",
      "@@ -10,0 +12,2 @@",
      "@@ -20 +22 @@",
      "diff --git a/new.ts b/new.ts",
      "--- /dev/null",
      "+++ b/new.ts",
      "@@ -0,0 +1,9 @@",
    ].join("\n");
    expect(changedLines(diff)).toEqual({
      "x.ts": [
        [3, 4],
        [10, 10],
        [20, 20],
      ],
    });
  });
});
