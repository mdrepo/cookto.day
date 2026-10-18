import { describe, expect, test } from "bun:test";
import { clashes, matchFood, nameIndex, tidy } from "../src/names.js";

// specs/148-food-names.md: one food, many names; matching reads them all.

const foods = [
  { id: "spinach", names: ["Spinach", "palak", "पालक", "PALAK", "BAYAM"] },
  { id: "okra", names: ["Okra", "bhindi", "LADIES FINGER"] },
  { id: "onion", names: ["Onion", "pyaz"] },
  { id: "eggplant", names: ["Brinjal", "baingan", "EGGPLANT"] },
  { id: "green-chilli", names: ["Green chilli", "CHILLI PADI"] },
  { id: "red-chilli", names: ["Red chilli"] },
];
const index = nameIndex(foods, { chilli: ["green-chilli", "red-chilli"] });

describe("food names", () => {
  test("tidying drops case, extra spaces, sizes and shop words", () => {
    expect(tidy("  FRESH  Palak 250G ")).toBe("palak");
    expect(tidy("BIG ONION 1KG")).toBe("onion");
    expect(tidy("Local Tomatoes PKT")).toBe("tomatoes");
  });

  test("a receipt's shop words land on the right food (#148, 1)", () => {
    expect(
      ["PALAK", "LADIES FINGER", "BIG ONION", "BRINJAL", "CHILLI PADI"].map(
        (line) => matchFood(line, index),
      ),
    ).toEqual([
      { food: "spinach" },
      { food: "okra" },
      { food: "onion" },
      { food: "eggplant" },
      { food: "green-chilli" },
    ]);
  });

  test("the whole line first, then its words", () => {
    expect(matchFood("Fresh Palak Bunch 250G", index)).toEqual({
      food: "spinach",
    });
    expect(matchFood("CHILLI PADI 100G", index)).toEqual({
      food: "green-chilli",
    });
  });

  test("a word that could be two foods asks (#148, 3)", () => {
    expect(matchFood("CHILLI", index)).toEqual({
      ask: ["green-chilli", "red-chilli"],
    });
  });

  test("a word nobody has taught it yet matches nothing (#148, 4)", () => {
    expect(matchFood("KANGKONG", index)).toBeNull();
  });

  test("one name for two foods, without an ask, is a clash (#148, 5)", () => {
    expect(
      clashes(
        [
          { id: "black-pepper", names: ["Black pepper", "PEPPER"] },
          { id: "capsicum", names: ["Capsicum", "pepper"] },
        ],
        {},
      ),
    ).toEqual([{ name: "pepper", foods: ["black-pepper", "capsicum"] }]);
    expect(
      clashes(
        [
          { id: "black-pepper", names: ["PEPPER"] },
          { id: "capsicum", names: ["pepper"] },
        ],
        { pepper: ["black-pepper", "capsicum"] },
      ),
    ).toEqual([]);
  });
});
