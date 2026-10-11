import { describe, expect, test } from "bun:test";
import { daysLeft } from "../src/expiry.js";

describe("daysLeft", () => {
  test("spinach bought 4 days ago that keeps 5 days has 1 day left", () => {
    expect(daysLeft("2026-10-06", 5, "2026-10-10")).toBe(1);
  });

  test("is 0 on the last good day", () => {
    expect(daysLeft("2026-10-05", 5, "2026-10-10")).toBe(0);
  });

  test("goes below 0 once it has gone off", () => {
    expect(daysLeft("2026-10-01", 3, "2026-10-10")).toBe(-6);
  });

  test("counts across months, leap days and clock changes", () => {
    expect(daysLeft("2028-02-27", 3, "2028-03-01")).toBe(0);
    expect(daysLeft("2026-03-28", 2, "2026-03-30")).toBe(0);
  });

  test("rejects a date that isn't YYYY-MM-DD", () => {
    expect(() => daysLeft("10/06/2026", 5, "2026-10-10")).toThrow(
      'Not a YYYY-MM-DD date: "10/06/2026"',
    );
  });
});
