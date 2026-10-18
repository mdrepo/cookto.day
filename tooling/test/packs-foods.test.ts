import { describe, expect, test } from "bun:test";
import { packProblems } from "../scripts/packs-lib.js";
import { goodPack, sources } from "./packs-fixture.js";

// packs:check on a food's shelf life, beyond FoodKeeper's own ranges
// (specs/149): shorter is fine, and an approved spec can decide one.

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
});
