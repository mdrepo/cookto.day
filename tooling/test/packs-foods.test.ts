import { describe, expect, test } from "bun:test";
import { packProblems, type Sources } from "../scripts/packs-lib.js";
import { goodPack, sources } from "./packs-fixture.js";

// packs:check on a food's shelf life, beyond FoodKeeper's own ranges
// (specs/149): shorter is fine, an approved spec can decide one, and food
// bought frozen keeps up to FoodKeeper's freezer time.

describe("packs:check, shelf lives", () => {
  test("a shorter shelf life than FoodKeeper's is fine; where it gives none, an approved spec decides (#149)", () => {
    const shorter = goodPack();
    shorter.ingredients.spinach = {
      wikidata: "Q81464",
      label: "Spinacia oleracea",
      keeps: { days: 2, in: "fridge", foodkeeper: 291 },
    };
    expect(packProblems(shorter, sources)).toEqual([]);

    const noTime = goodPack();
    const keeps = { days: 7, in: "pantry" as const, foodkeeper: 291 };
    noTime.ingredients.spinach = {
      wikidata: "Q81464",
      label: "Spinacia oleracea",
      keeps,
    };
    expect(packProblems(noTime, sources)).toEqual([
      "ingredients/spinach.json: keeps 7 days in the pantry, but FoodKeeper 291 (Lettuce, leaf, spinach) gives no time in the pantry. Cite an entry that does, or the approved spec that decided it.",
    ]);
    (noTime.ingredients.spinach as { keeps: object }).keeps = {
      ...keeps,
      spec: 149,
    };
    expect(packProblems(noTime, sources)).toEqual([]);
  });

  test("food bought frozen keeps up to FoodKeeper's freezer time (#149)", () => {
    const frozen = { ...sources };
    frozen.foodkeeper = {
      "291": {
        ...(sources.foodkeeper["291"] as Sources["foodkeeper"][string]),
        freezer: [240, 240],
      },
    };
    const pack = goodPack();
    const spinach = pack.ingredients.spinach as { freezes?: object };
    spinach.freezes = { days: 90, foodkeeper: 291 };
    expect(packProblems(pack, frozen)).toEqual([]);
    spinach.freezes = { days: 300, foodkeeper: 291 };
    expect(packProblems(pack, frozen)).toEqual([
      "ingredients/spinach.json: keeps 300 days frozen, but FoodKeeper 291 (Lettuce, leaf, spinach) says 240 to 240. Use 240 or fewer: shorter only warns early.",
    ]);
  });
});
