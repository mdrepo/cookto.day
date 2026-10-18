import { describe, expect, test } from "bun:test";
import { nameProblems } from "../scripts/packs-names.js";

// specs/148-food-names.md, criterion 5: one name, after tidying, may point to
// only one food, unless it's a word to ask about.

describe("packs:check, food names", () => {
  test("one name for two foods fails, naming both", () => {
    expect(
      nameProblems(
        {
          "black-pepper": ["Black pepper", "PEPPER"],
          capsicum: ["Capsicum", "pepper"],
        },
        {},
      ),
    ).toEqual([
      'ingredients: "pepper" names both black-pepper and capsicum. Add it to packs/ask.json, so the app asks, or take it off one of them.',
    ]);
  });

  test("a word to ask about may name both; one it asks about must be a food", () => {
    const foods = {
      "black-pepper": ["PEPPER"],
      capsicum: ["pepper"],
    };
    expect(
      nameProblems(foods, { pepper: ["black-pepper", "capsicum"] }),
    ).toEqual([]);
    expect(
      nameProblems(foods, { pepper: ["black-pepper", "paprika"] }),
    ).toEqual([
      'packs/ask.json: "pepper" asks about paprika, which has no ingredients/paprika.json.',
      'ingredients: "pepper" names both black-pepper and capsicum. Add it to packs/ask.json, so the app asks, or take it off one of them.',
    ]);
  });
});
