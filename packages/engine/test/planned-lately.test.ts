import { describe, expect, test } from "bun:test";
import { plannedLately } from "../src/cooked.js";

// specs/195-who-cooks.md, criterion 6: a meal planned for a day that has
// passed counts as made, so it isn't picked again for a couple of days.

const plan = (on: string, dish: string, extra = {}) => ({
  on,
  dish,
  ...extra,
});

describe("plannedLately", () => {
  test("yesterday's and the day before's plans, not today's or older", () => {
    const plans = [
      plan("2026-10-15", "chole"),
      plan("2026-10-16", "rajma"),
      plan("2026-10-17", "dal-tadka"),
      plan("2026-10-18", "poha"),
    ];
    expect([...plannedLately(plans, "2026-10-18", 2)].sort()).toEqual([
      "dal-tadka",
      "rajma",
    ]);
  });

  test("a meal not made, or moved on for its prep, doesn't count", () => {
    const plans = [
      plan("2026-10-17", "dal-tadka", { made: "no" }),
      plan("2026-10-17", "chole", { prep: "skipped" }),
      plan("2026-10-17", "poha", { for: "child" }),
    ];
    expect([...plannedLately(plans, "2026-10-18", 2)]).toEqual(["poha"]);
  });
});
