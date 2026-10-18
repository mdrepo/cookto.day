import { describe, expect, test } from "bun:test";
import { packProblems, type Sources } from "../scripts/packs-lib.js";
import { goodPack, sources } from "./packs-fixture.js";

// packs:check on a food bought frozen (specs/149, criterion 4): its freezer
// time is held to FoodKeeper's, like a fridge or pantry shelf life.

describe("packs:check, frozen food", () => {
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
