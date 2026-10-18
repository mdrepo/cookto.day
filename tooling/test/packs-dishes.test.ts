import { describe, expect, test } from "bun:test";
import { packProblems } from "../scripts/packs-lib.js";
import { goodPack, sources, STEPS } from "./packs-fixture.js";

// packs:check's newer rules for a dish (scripts/packs-dishes.ts): its prep
// (specs/144), and a child's own dish (specs/145). The older dish rules are
// tested in packs-lib.test.ts.

describe("packs:check, a dish", () => {
  test("a dish's prep says what to do, to which of its ingredients, and how long before (#144)", () => {
    const at = "test-kitchen/dishes/spinach-rice.json";
    const pack = goodPack();
    const dish = pack.dishes["spinach-rice"] as { prep?: unknown };
    dish.prep = [{ do: "soak", what: "rice", hours: 1 }];
    expect(packProblems(pack, sources)).toEqual([]);
    dish.prep = [
      { do: "boil", what: "rice", hours: 1 },
      { do: "soak", what: "lentils", hours: 8 },
      { do: "soak", what: "rice", hours: 0 },
    ];
    expect(packProblems(pack, sources)).toEqual([
      `${at}: prep 1 must be one of soak, marinate, ferment, thaw, done to one of its ingredients, some hours before.`,
      `${at}: prep 2 must be one of soak, marinate, ferment, thaw, done to one of its ingredients, some hours before.`,
      `${at}: prep 3 must be one of soak, marinate, ferment, thaw, done to one of its ingredients, some hours before.`,
    ]);
  });

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
