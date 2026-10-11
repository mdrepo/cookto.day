import { describe, expect, test } from "bun:test";
import { limitFor, lineCount, sizeProblems } from "../scripts/file-size-lib.js";

describe("limitFor", () => {
  test.each([
    ["packages/ui/src/components/Field/Field.tsx", 150],
    ["apps/web/src/app.tsx", 150],
    ["apps/web/src/i18n/en.ts", 300],
    ["packages/ui/test/Field.test.tsx", 300],
    ["tooling/scripts/tdd-verify.ts", 300],
    ["DESIGN.md", 300],
    ["apps/web/src/styles.css", 300],
  ])("%p may have %p lines", (path, limit) => {
    expect(limitFor(path)).toBe(limit);
  });

  test("leaves out the lockfile and images", () => {
    expect(limitFor("bun.lock")).toBeNull();
    expect(limitFor("apps/web/src/brand/icon-180.png")).toBeNull();
    expect(limitFor("apps/web/src/brand/favicon.svg")).toBeNull();
  });
});

describe("lineCount", () => {
  test("counts lines, not the newline at the end", () => {
    expect(lineCount("a\nb\n")).toBe(2);
    expect(lineCount("a\nb")).toBe(2);
    expect(lineCount("")).toBe(0);
  });
});

describe("sizeProblems", () => {
  test("files within their limit pass", () => {
    expect(
      sizeProblems([
        { path: "apps/web/src/app.tsx", lines: 150 },
        { path: "tooling/scripts/x.ts", lines: 300 },
      ]),
    ).toEqual([]);
  });

  test("a component over 150 lines fails, saying to split it", () => {
    const [problem] = sizeProblems([
      { path: "packages/ui/src/components/Card/Card.tsx", lines: 151 },
    ]);
    expect(problem).toContain("Card.tsx");
    expect(problem).toContain("151");
    expect(problem).toContain("150");
    expect(problem).toContain("Split");
  });

  test("any other file over 300 lines fails", () => {
    expect(
      sizeProblems([{ path: "tooling/scripts/x.ts", lines: 301 }]),
    ).toHaveLength(1);
  });
});
