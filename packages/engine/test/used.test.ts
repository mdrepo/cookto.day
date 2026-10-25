import { describe, expect, test } from "bun:test";
import { usedBy } from "../src/used.js";

// specs/242-meal-checks.md, criterion 9: what a meal takes from the pantry.
// The recipe's amount for one person, times the people who ate it, for
// each food the pantry holds with an amount in the recipe's unit; a
// child's extra takes its own amount. Food with no amount ("have it"), in
// another unit, or not in the pantry is left alone.

const TOOR = "Q103449274",
  ONION = "Q3406628",
  RICE = "Q5090",
  TOMATO = "Q20638126",
  GHEE = "Q323225",
  MOONG = "Q2290588";

const dalTadka = {
  ingredients: [TOOR, ONION, RICE, TOMATO],
  amounts: [
    [80, "g"],
    [1, "pieces"],
    [90, "g"],
    [60, "g"],
  ] as const,
  people: 2,
};
const childKhichdi = {
  ingredients: [MOONG],
  amounts: [[40, "g"]] as const,
  people: 1,
  addIn: [GHEE, 5, "ml"] as const,
};
const pantry = [
  { ingredient: TOOR, amount: 500, unit: "g" as const },
  { ingredient: ONION, amount: 1, unit: "pieces" as const },
  { ingredient: GHEE, amount: 200, unit: "ml" as const },
  { ingredient: RICE },
];

describe("what a meal uses", () => {
  test("the recipe's amounts for the people who ate it, and the child's extra", () => {
    expect(usedBy([dalTadka, childKhichdi], pantry)).toEqual([
      { ingredient: TOOR, amount: 160, unit: "g" },
      { ingredient: ONION, amount: 2, unit: "pieces" },
      { ingredient: GHEE, amount: 5, unit: "ml" },
    ]);
  });

  test("food in another unit than the recipe's is left alone", () => {
    expect(
      usedBy([dalTadka], [{ ingredient: TOOR, amount: 2, unit: "pieces" }]),
    ).toEqual([]);
  });

  test("two dishes that use one food take it once, added up", () => {
    expect(
      usedBy(
        [dalTadka, { ...dalTadka, people: 1 }],
        [{ ingredient: TOOR, amount: 500, unit: "g" }],
      ),
    ).toEqual([{ ingredient: TOOR, amount: 240, unit: "g" }]);
  });
});
