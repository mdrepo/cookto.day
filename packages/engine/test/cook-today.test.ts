import { describe, expect, test } from "bun:test";
import { cookToday, type Dish } from "../src/cook-today.js";
import type { PantryItem } from "../src/pantry.js";

// specs/72-kitchen.md: what to cook today, food that needs using first, and
// what the household doesn't make (ADR 0027). Ids are made up for the test;
// the engine knows no cuisine.

const today = "2026-10-13";
const item = (ingredient: string, extra: Partial<PantryItem> = {}) =>
  ({
    id: ingredient,
    ingredient,
    boughtOn: today,
    shelfLifeDays: 5,
    ...extra,
  }) satisfies PantryItem;

const palakPaneer: Dish = {
  id: "palak-paneer",
  slots: ["lunch", "dinner"],
  ingredients: ["spinach", "paneer", "oil"],
  servedWith: ["roti", "rice"],
};
const alooJeera: Dish = {
  id: "aloo-jeera",
  slots: ["lunch", "dinner"],
  ingredients: ["potato", "cumin"],
  servedWith: ["roti"],
};
const chole: Dish = {
  id: "chole",
  slots: ["lunch", "dinner"],
  ingredients: ["chickpeas", "onion"],
};
const poha: Dish = {
  id: "poha",
  slots: ["breakfast"],
  ingredients: ["flattened-rice", "onion"],
};
const dishes = [chole, alooJeera, palakPaneer, poha];
const staples = new Set(["oil", "cumin", "flattened-rice"]);

const ids = (list: { dish: Dish }[]) => list.map((s) => s.dish.id);

describe("cook today", () => {
  test("only dishes for the slot; ones the pantry can make come first, saying what fresh food they use", () => {
    const pantry = [item("spinach"), item("paneer"), item("potato")];
    const lunch = cookToday({ slot: "lunch", dishes, pantry, staples, today });
    expect(ids(lunch)).toEqual(["palak-paneer", "aloo-jeera", "chole"]);
    expect(lunch[0]?.uses).toEqual(["spinach", "paneer"]);
    expect(lunch[0]?.needs).toEqual([]);
  });

  test("a dish missing something says what it needs; staples are assumed", () => {
    const lunch = cookToday({
      slot: "lunch",
      dishes,
      pantry: [item("onion")],
      staples,
      today,
    });
    const choleSuggestion = lunch.find((s) => s.dish.id === "chole");
    expect(choleSuggestion?.needs).toEqual(["chickpeas"]);
    const breakfast = cookToday({
      slot: "breakfast",
      dishes,
      pantry: [item("onion")],
      staples,
      today,
    });
    expect(breakfast[0]?.needs).toEqual([]);
  });

  test("food past its best comes first, then use soon, then the nearest use-by", () => {
    const wilted = cookToday({
      slot: "dinner",
      dishes,
      pantry: [
        item("potato", { shelfLifeDays: 30 }),
        item("spinach", { mark: "past-its-best" }),
        item("paneer", { shelfLifeDays: 30 }),
      ],
      staples,
      today,
    });
    expect(ids(wilted).slice(0, 2)).toEqual(["palak-paneer", "aloo-jeera"]);

    const nearer = cookToday({
      slot: "dinner",
      dishes,
      pantry: [
        item("potato", { shelfLifeDays: 4 }),
        item("spinach", { shelfLifeDays: 9 }),
        item("paneer", { shelfLifeDays: 9 }),
      ],
      staples,
      today,
    });
    expect(ids(nearer).slice(0, 2)).toEqual(["aloo-jeera", "palak-paneer"]);
  });

  test("among dishes that need things, the fewest missing come first", () => {
    const lunch = cookToday({
      slot: "lunch",
      dishes,
      pantry: [],
      staples,
      today,
    });
    expect(ids(lunch)).toEqual(["aloo-jeera", "chole", "palak-paneer"]);
  });

  test("what the household doesn't make: no dish offers it, and a dish served with it offers what's left", () => {
    const lunch = cookToday({
      slot: "lunch",
      dishes,
      pantry: [item("spinach"), item("paneer"), item("potato")],
      staples,
      today,
      skip: new Set(["roti"]),
    });
    const by = new Map(lunch.map((s) => [s.dish.id, s]));
    expect(by.get("palak-paneer")?.servedWith).toEqual(["rice"]);
    expect(by.get("aloo-jeera")?.servedWith).toEqual([]);
    expect(lunch.flatMap((s) => s.servedWith)).not.toContain("roti");

    const noPaneer = cookToday({
      slot: "lunch",
      dishes,
      pantry: [],
      staples,
      today,
      skip: new Set(["paneer"]),
    });
    expect(ids(noPaneer)).not.toContain("palak-paneer");
  });

  test("a staple the person typed in, or one with an amount, still counts once", () => {
    const lunch = cookToday({
      slot: "lunch",
      dishes: [alooJeera],
      pantry: [
        item("potato"),
        { id: "cumin", ingredient: "cumin", boughtOn: today },
      ],
      staples,
      today,
    });
    expect(lunch[0]?.uses).toEqual(["potato"]);
  });
});
