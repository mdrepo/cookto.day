import { describe, expect, test } from "bun:test";
import {
  childrenOnly,
  cookTodayForMeals,
  type Dish,
  type Member,
  servings,
} from "../src/index.js";

// specs/145-child-dish.md: some days the child eats a dish of their own.

const adult = (id: string): Member => ({
  id,
  kind: "adult",
  meals: ["lunch", "dinner"],
});
const toddler: Member = {
  id: "t",
  kind: "toddler",
  meals: ["breakfast", "lunch", "evening-snack", "dinner"],
};
const family = [adult("a"), adult("b"), toddler];

const dal: Dish = {
  id: "dal",
  slots: ["lunch", "evening-snack"],
  ingredients: [],
};
const khichdi: Dish = {
  id: "veg-khichdi",
  slots: ["lunch", "dinner"],
  ingredients: [],
  for: ["child"],
};
const banana: Dish = {
  id: "banana",
  slots: ["evening-snack"],
  ingredients: [],
  for: ["child"],
};

describe("a child's own dish", () => {
  test("a meal only children eat is theirs", () => {
    expect(childrenOnly("evening-snack", family)).toBe(true);
    expect(childrenOnly("lunch", family)).toBe(false);
    expect(childrenOnly("morning-snack", family)).toBe(false);
  });

  test("a meal only children eat picks from the child's list; the others never do (#145, 4)", () => {
    const meals = cookTodayForMeals({
      slots: ["lunch", "evening-snack"],
      dishes: [khichdi, banana, dal],
      pantry: [],
      staples: new Set(),
      today: "2026-10-18",
      childSlots: new Set(["evening-snack"]),
    });
    expect(meals.map((m) => m.suggestions.map((s) => s.dish.id))).toEqual([
      ["dal"],
      ["banana"],
    ]);
  });

  test("with a dish of their own, the main dish is for the adults (#145, 1 and 2)", () => {
    expect(servings("lunch", family, false)).toBe(3);
    expect(servings("lunch", family, true)).toBe(2);
    expect(servings("lunch", family, "child")).toBe(1);
  });
});
