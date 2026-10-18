import { describe, expect, test } from "bun:test";
import { addDays } from "../src/expiry.js";
import { cookedLately, cookedOn } from "../src/cooked.js";
import { assumedStaples, missing } from "../src/needs.js";

// One rule for what a dish still needs (specs/72, 97), what was cooked
// lately (specs/104), and counting days: Today, Dishes and a dish's page
// all ask the engine. Ids are made up.

describe("what a dish still needs", () => {
  const all = new Set(["salt", "oil", "cumin"]);

  test("every staple is assumed until the household adds one of its own", () => {
    expect(assumedStaples(all, [{ ingredient: "spinach" }])).toEqual(all);
    expect(
      assumedStaples(all, [{ ingredient: "spinach" }, { ingredient: "oil" }]),
    ).toEqual(new Set());
  });

  test("what the kitchen doesn't have, in the dish's order, staples aside", () => {
    expect(
      missing(
        ["onion", "salt", "spinach", "paneer"],
        new Set(["spinach"]),
        all,
      ),
    ).toEqual(["onion", "paneer"]);
  });
});

describe("cooked lately", () => {
  const history = [
    { dish: "chole", on: "2026-10-10" },
    { dish: "rajma", on: "2026-10-14" },
    { dish: "poha", on: "2026-10-16" },
    { dish: "dal", on: "2026-10-17" },
  ];

  test("the days before today, not today and not before the window", () => {
    expect(cookedLately(history, "2026-10-17", 3)).toEqual(
      new Set(["rajma", "poha"]),
    );
    expect(cookedOn(history, "2026-10-17")).toEqual(new Set(["dal"]));
  });
});

describe("counting days", () => {
  test("across months, years and a leap day, both ways", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-10-17", 0)).toBe("2026-10-17");
  });
});
