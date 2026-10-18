import { describe, expect, test } from "bun:test";
import { packProblems } from "../scripts/packs-lib.js";
import { goodPack, sources, STEPS } from "./packs-fixture.js";

// packs:check's rules for a child's own dish (specs/145). The other dish
// rules are tested in packs-lib.test.ts.

describe("packs:check, a dish", () => {
  test("plain fruit or bread and butter can have one to three steps (#145)", () => {
    const pack = goodPack();
    const dish = pack.dishes["spinach-rice"] as {
      simple?: boolean;
      steps: string[];
    };
    dish.simple = true;
    dish.steps = ["Peel and serve."];
    expect(packProblems(pack, sources)).toEqual([]);
    dish.steps = STEPS;
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/dishes/spinach-rice.json: has 6 steps. A simple dish has one to three.",
    ]);
  });

  test("a child's dish says so, and its add-ins are foods the pack knows (#145)", () => {
    const pack = goodPack();
    const dish = pack.dishes["spinach-rice"] as {
      for?: string[];
      addIns?: Record<string, { amount: number; unit: string }>;
    };
    dish.for = ["child"];
    dish.addIns = { rice: { amount: 20, unit: "g" } };
    expect(packProblems(pack, sources)).toEqual([]);
    dish.for = ["grandad"];
    dish.addIns = { egg: { amount: 1, unit: "pieces" } };
    expect(packProblems(pack, sources)).toEqual([
      'test-kitchen/dishes/spinach-rice.json: "for" can only be ["child"].',
      "test-kitchen/dishes/spinach-rice.json: its add-in egg has no ingredients/egg.json, or no amount in g, ml or pieces.",
    ]);
  });
});
