import { describe, expect, test } from "bun:test";
import { packProblems } from "../scripts/packs-lib.js";
import { goodPack, sources, STEPS } from "./packs-fixture.js";

// packs:check's rules for a dish (scripts/packs-dishes.ts): checked against
// full recipes, with short steps of our own (specs/149), its prep (specs/144),
// and a child's own dish (specs/145).

describe("packs:check, a dish", () => {
  test("a dish is checked against two full recipes, or cooked at home (#149)", () => {
    const pack = goodPack();
    const dish = pack.dishes["spinach-rice"] as { sources: string[] };
    dish.sources = ["https://example.com/spinach-rice"];
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/dishes/spinach-rice.json: one source. Check it against a second full recipe, and add that link too.",
    ]);
    dish.sources = ["cooked at home by A. Cook"];
    expect(packProblems(pack, sources)).toEqual([]);
  });

  test("a dish has six to eight short steps, in our own words (#149)", () => {
    const pack = goodPack();
    const dish = pack.dishes["spinach-rice"] as { steps?: string[] };
    const at = "test-kitchen/dishes/spinach-rice.json";
    delete dish.steps;
    expect(packProblems(pack, sources)).toEqual([
      `${at}: has 0 steps. Write six to eight short steps, one action each.`,
    ]);
    dish.steps = [...STEPS, "Add salt.", "Stir.", "Serve."];
    expect(packProblems(pack, sources)).toEqual([
      `${at}: has 9 steps. Write six to eight short steps, one action each.`,
    ]);
    dish.steps = [...STEPS.slice(1), `Wash ${"the rice and ".repeat(12)}stop.`];
    expect(packProblems(pack, sources)).toEqual([
      `${at}: step 6 is long. Keep each step to one action, under 140 characters.`,
    ]);
  });

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

  test("a note that still asks for a check fails, naming the dish (#149)", () => {
    const at = "test-kitchen/dishes/spinach-rice.json";
    for (const note of [
      "One egg a serving looks low: check.",
      "Read through a page summary, not the page itself.",
      "Check the onions.",
    ]) {
      const pack = goodPack();
      (pack.dishes["spinach-rice"] as { note?: string }).note = note;
      expect(packProblems(pack, sources)).toEqual([
        `${at}: its note still asks for a check ("${note}"). A note ships as it is: settle it, then say what was decided.`,
      ]);
    }
    const settled = goodPack();
    (settled.dishes["spinach-rice"] as { note?: string }).note =
      "Two eggs a person, as the owner cooks it.";
    expect(packProblems(settled, sources)).toEqual([]);
  });
});
