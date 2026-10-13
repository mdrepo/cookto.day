import { describe, expect, test } from "bun:test";
import {
  conditionOf,
  shownAmount,
  type PantryItem,
  pantryOrder,
  useBy,
} from "../src/pantry.js";

// specs/72-kitchen.md: pantry items keep an amount and a condition, and the
// person's mark wins over the date (ADR 0027).

const today = "2026-10-13";
const spinach: PantryItem = {
  id: "p1",
  ingredient: "Q81464",
  amount: 250,
  unit: "g",
  boughtOn: today,
  shelfLifeDays: 3,
};
const onions: PantryItem = {
  id: "p2",
  ingredient: "Q23485",
  amount: 1000,
  unit: "g",
  boughtOn: "2026-10-01",
  shelfLifeDays: 30,
};
const rice: PantryItem = {
  id: "p3",
  ingredient: "Q5090",
  boughtOn: "2026-09-01",
};

describe("the pantry", () => {
  test("fresh food is used by its bought day plus its shelf life; a staple has no use-by", () => {
    expect(useBy(spinach)).toBe("2026-10-16");
    expect(useBy(rice)).toBeUndefined();
  });

  test("condition comes from the date: good, then use soon on its last day, then past its best", () => {
    expect(conditionOf(spinach, today)).toBe("good");
    expect(conditionOf(spinach, "2026-10-15")).toBe("use-soon");
    expect(conditionOf(spinach, "2026-10-16")).toBe("use-soon");
    expect(conditionOf(spinach, "2026-10-17")).toBe("past-its-best");
    expect(conditionOf(rice, "2030-01-01")).toBe("good");
  });

  test("the person's mark wins over the date, worse or better", () => {
    expect(conditionOf({ ...spinach, mark: "past-its-best" }, today)).toBe(
      "past-its-best",
    );
    expect(conditionOf({ ...spinach, mark: "good" }, "2026-10-17")).toBe(
      "good",
    );
  });

  test("fresh food that needs using comes first, then the nearest use-by; staples keep their order", () => {
    const potatoes: PantryItem = { ...onions, id: "p4", ingredient: "Q10998" };
    const wilted = { ...spinach, mark: "past-its-best" as const };
    expect(
      pantryOrder([onions, potatoes, spinach], today).map((i) => i.id),
    ).toEqual(["p1", "p2", "p4"]);
    expect(pantryOrder([onions, wilted], today).map((i) => i.id)).toEqual([
      "p1",
      "p2",
    ]);
    expect(pantryOrder([rice, spinach], today).map((i) => i.id)).toEqual([
      "p1",
      "p3",
    ]);
  });

  test("a large amount shows in kg or litres; an unknown amount shows as none", () => {
    expect(shownAmount(250, "g")).toEqual({ value: 250, unit: "g" });
    expect(shownAmount(1500, "g")).toEqual({ value: 1.5, unit: "kg" });
    expect(shownAmount(2000, "ml")).toEqual({ value: 2, unit: "l" });
    expect(shownAmount(12, "pieces")).toEqual({ value: 12, unit: "pieces" });
    expect(shownAmount(undefined, undefined)).toBeUndefined();
  });
});
