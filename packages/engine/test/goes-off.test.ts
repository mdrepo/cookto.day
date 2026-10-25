import { describe, expect, test } from "bun:test";
import { goesOffWith, type PantryItem } from "../src/pantry.js";

// specs/270, criterion 2's rule: a planned dish says which of its fresh food
// goes off within a day of the meal, the soonest first; food that keeps
// longer, staples, and food already gone off give no reason.

const item = (
  id: string,
  ingredient: string,
  boughtOn: string,
  days?: number,
) =>
  ({
    id,
    ingredient,
    boughtOn,
    ...(days === undefined ? {} : { shelfLifeDays: days }),
  }) as PantryItem;

const THURSDAY = "2026-10-22";

describe("food a dish uses that goes off soon", () => {
  test("the soonest of the dish's food going off on the day or the day after", () => {
    const pantry = [
      item("p1", "curd", "2026-10-20", 3), // last good day Friday
      item("p2", "spinach", "2026-10-20", 2), // Thursday
      item("p3", "onion", "2026-10-20", 30),
      item("p4", "salt", "2026-01-01"),
    ];
    expect(goesOffWith(["onion", "curd", "spinach"], pantry, THURSDAY)).toEqual(
      { ingredient: "spinach", useBy: THURSDAY },
    );
    expect(goesOffWith(["curd", "salt"], pantry, THURSDAY)).toEqual({
      ingredient: "curd",
      useBy: "2026-10-23",
    });
  });

  test("nothing when the food keeps longer, is a staple, isn't used, or already went off", () => {
    const pantry = [
      item("p1", "curd", "2026-10-15", 3), // gone off on the 18th
      item("p2", "onion", "2026-10-20", 30),
      item("p3", "salt", "2026-01-01"),
      item("p4", "paneer", "2026-10-21", 2), // Friday, but not in the dish
    ];
    expect(goesOffWith(["curd", "onion", "salt"], pantry, THURSDAY)).toBeNull();
  });
});
