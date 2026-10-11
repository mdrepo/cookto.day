import { describe, expect, test } from "bun:test";
import {
  evaluateHealth,
  type PackageFacts,
} from "../scripts/dependency-health.js";

const now = new Date("2026-10-05T00:00:00Z");

const healthy: PackageFacts = {
  name: "good-pkg",
  version: "1.0.0",
  scorecard: 7.1,
  lastRelease: "2026-09-01T00:00:00Z",
  maintainers: 3,
  installScripts: [],
  license: "MIT",
  provenance: true,
  transitive: 4,
};

describe("evaluateHealth", () => {
  test("a healthy package passes with nothing to report", () => {
    expect(evaluateHealth(healthy, {}, now)).toEqual({
      failures: [],
      warnings: [],
      unusedExceptions: [],
    });
  });

  test.each([
    [{ scorecard: 4.9 }, "scorecard"],
    [{ scorecard: null }, "scorecard"],
    [{ lastRelease: "2025-09-01T00:00:00Z" }, "recent-release"],
    [{ maintainers: 1 }, "maintainers"],
    [{ installScripts: ["postinstall"] }, "install-scripts"],
    [{ license: "GPL-3.0" }, "license"],
    [{ license: null }, "license"],
  ] as [Partial<PackageFacts>, string][])(
    "fails %p on the %s check",
    (change, check) => {
      const { failures } = evaluateHealth({ ...healthy, ...change }, {}, now);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toEndWith(`[${check}]`);
    },
  );

  test("accepts a licence when any OR alternative is allowed", () => {
    const facts = { ...healthy, license: "(GPL-2.0 OR MIT)" };
    expect(evaluateHealth(facts, {}, now).failures).toEqual([]);
  });

  test("an exception turns a failure into a warning, for that check only", () => {
    const facts = { ...healthy, maintainers: 1, license: "GPL-3.0" };
    const result = evaluateHealth(facts, { maintainers: "well known" }, now);
    expect(result.failures).toEqual([
      expect.stringContaining("[license]") as string,
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining("allowed by exception") as string,
    ]);
  });

  test("reports an exception that is no longer needed", () => {
    const result = evaluateHealth(healthy, { maintainers: "was one" }, now);
    expect(result.unusedExceptions).toHaveLength(1);
  });

  test("warns, without failing, on missing provenance and many transitive packages", () => {
    const facts = { ...healthy, provenance: false, transitive: 92 };
    const result = evaluateHealth(facts, {}, now);
    expect(result.failures).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  test("warns when the transitive count is unknown", () => {
    const result = evaluateHealth({ ...healthy, transitive: null }, {}, now);
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual([
      "good-pkg@1.0.0: transitive package count unavailable",
    ]);
  });
});
