import { describe, expect, test } from "bun:test";
import {
  changedLines,
  onePerTest,
  touchedTests,
  type TestResult,
} from "../scripts/tdd-verify-lib.js";

const result = (line: number, title: string): TestResult => ({
  file: "e2e/suggestions.spec.ts",
  line,
  title,
  passed: true,
});

describe("onePerTest", () => {
  // Playwright reports a test once per project (phone, iPhone, desktop).
  test("a test passes only when it passes in every project", () => {
    const phone = result(10, "a screen is one column");
    const desktop = { ...phone, passed: false };
    const other = result(20, "another");
    expect(onePerTest([phone, desktop, other, other])).toEqual([
      desktop,
      other,
    ]);
  });
});

describe("touchedTests", () => {
  const tests = [
    result(10, "first"),
    result(20, "second"),
    result(30, "third"),
  ];

  test("finds a test whose body changed", () => {
    const touched = touchedTests(tests, { "e2e/suggestions.spec.ts": [24] });
    expect(touched.map((t) => t.title)).toEqual(["second"]);
  });

  test("the last test runs to the end of the file", () => {
    const touched = touchedTests(tests, { "e2e/suggestions.spec.ts": [99] });
    expect(touched.map((t) => t.title)).toEqual(["third"]);
  });

  test("ignores changes above the first test, like imports", () => {
    expect(touchedTests(tests, { "e2e/suggestions.spec.ts": [1, 2] })).toEqual(
      [],
    );
  });

  test("ignores files with no added lines", () => {
    expect(touchedTests(tests, {})).toEqual([]);
  });
});

describe("changedLines", () => {
  test("counts added lines at their new line numbers", () => {
    const diff = [
      "diff --git a/x b/x",
      "--- a/x",
      "+++ b/x",
      "@@ -10,0 +11,2 @@",
      "+  expect(a).toBe(1);",
      "+  expect(b).toBe(2);",
    ].join("\n");
    expect(changedLines(diff)).toEqual([11, 12]);
  });

  test("counts a pure deletion at the line before it", () => {
    // Removing `test.fail();` from inside the test declared on line 79.
    const diff = [
      "@@ -82,3 +81,0 @@",
      "-    // Known bug",
      "-    // ...",
      "-    test.fail();",
    ].join("\n");
    expect(changedLines(diff)).toEqual([81]);
  });

  test("counts a replaced line where it is, not on the line before", () => {
    // Renaming the test declared on line 228 must not touch the test above.
    const diff = [
      "@@ -228 +228 @@",
      '-  test("old name", async ({',
      '+  test("new name", async ({',
    ].join("\n");
    expect(changedLines(diff)).toEqual([228]);
  });

  test("ignores a line that only opens a describe block", () => {
    // A new describe after the last test must not touch that test.
    const diff = [
      "@@ -45,0 +46,3 @@",
      "+",
      '+describe("pantry", () => {',
      '+  test("x", async () => {',
    ].join("\n");
    expect(changedLines(diff)).toEqual([48]);
  });

  test("ignores blank and bracket-only additions", () => {
    const diff = [
      "@@ -140,0 +141,4 @@",
      "+",
      "+});",
      '+test("x", () => {',
      "+  expect(1).toBe(1);",
    ].join("\n");
    expect(changedLines(diff)).toEqual([143, 144]);
  });
});
