import { describe, expect, test } from "bun:test";
import { type Pack, packProblems, type Sources } from "../scripts/packs-lib.js";

// specs/72-kitchen.md criterion 12: no made-up food data. Every dish has a
// source, every Wikidata id matches Wikidata's own label, and every shelf
// life cites a USDA FoodKeeper entry it agrees with (ADR 0015, 0027).

const sources: Sources = {
  wikidata: { Q81464: "Spinacia oleracea", Q5090: "rice" },
  foodkeeper: {
    "291": { name: "Lettuce, leaf, spinach", fridge: [3, 7], pantry: null },
  },
};

function goodPack(): Pack {
  return {
    id: "test-kitchen",
    languages: ["en"],
    parts: ["rice"],
    staples: { "grains-and-dals": ["rice"], spices: [], basics: [] },
    ingredients: {
      spinach: {
        wikidata: "Q81464",
        label: "Spinacia oleracea",
        keeps: { days: 3, in: "fridge", foodkeeper: 291 },
      },
      rice: { wikidata: "Q5090", label: "rice" },
    },
    dishes: {
      "spinach-rice": {
        slots: ["lunch"],
        ingredients: {
          spinach: { amount: 100, unit: "g" },
          rice: { amount: 80, unit: "g" },
        },
        servedWith: ["rice"],
        source: "https://example.com/spinach-rice",
      },
    },
    words: {
      en: {
        dishes: { "spinach-rice": "Spinach rice" },
        ingredients: { spinach: "Spinach", rice: "Rice" },
        parts: { rice: "Rice" },
      },
    },
  };
}

describe("packs:check", () => {
  test("a pack with sources, matching ids and cited shelf lives passes", () => {
    expect(packProblems(goodPack(), sources)).toEqual([]);
  });

  test("a dish without a source fails, saying how to fix it", () => {
    const pack = goodPack();
    delete (pack.dishes["spinach-rice"] as { source?: string }).source;
    expect(packProblems(pack, sources)).toEqual([
      'test-kitchen/dishes/spinach-rice.json: no source. Add "source": a published recipe\'s https link, or "cooked at home by <reviewer>".',
    ]);
    const pack2 = goodPack();
    (pack2.dishes["spinach-rice"] as { source: string }).source = "my memory";
    expect(packProblems(pack2, sources)[0]).toContain("no source");
  });

  test("an id whose Wikidata label names something else fails", () => {
    const pack = goodPack();
    pack.ingredients.spinach = {
      ...pack.ingredients.spinach,
      label: "spinach",
    } as Pack["ingredients"][string];
    expect(packProblems(pack, sources)).toEqual([
      'test-kitchen/ingredients/spinach.json: Wikidata calls Q81464 "Spinacia oleracea", not "spinach". Check the id on wikidata.org, then copy its English label exactly.',
    ]);
  });

  test("an id missing from the stored copy fails, saying to refresh it", () => {
    const pack = goodPack();
    pack.ingredients.spinach = {
      ...pack.ingredients.spinach,
      wikidata: "Q999999999",
    } as Pack["ingredients"][string];
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/ingredients/spinach.json: Q999999999 isn't in packs/sources/wikidata.json. Run `bun run packs:refresh`; if it still isn't there, the id doesn't exist.",
    ]);
  });

  test("a shelf life without its FoodKeeper entry, or outside it, fails", () => {
    const uncited = goodPack();
    uncited.ingredients.spinach = {
      wikidata: "Q81464",
      label: "Spinacia oleracea",
      keeps: { days: 3, in: "fridge" },
    } as unknown as Pack["ingredients"][string];
    expect(packProblems(uncited, sources)).toEqual([
      'test-kitchen/ingredients/spinach.json: its shelf life cites no FoodKeeper entry. Add "foodkeeper": the entry\'s ID from packs/sources/foodkeeper.json.',
    ]);

    const tooLong = goodPack();
    tooLong.ingredients.spinach = {
      wikidata: "Q81464",
      label: "Spinacia oleracea",
      keeps: { days: 10, in: "fridge", foodkeeper: 291 },
    };
    expect(packProblems(tooLong, sources)).toEqual([
      "test-kitchen/ingredients/spinach.json: keeps 10 days in the fridge, but FoodKeeper 291 (Lettuce, leaf, spinach) says 3 to 7. Use a number in that range.",
    ]);
  });

  test("an ingredient is a staple or has a shelf life, and a dish uses only defined ones", () => {
    const pack = goodPack();
    pack.ingredients["paneer"] = { wikidata: "Q5090", label: "rice" };
    (pack.dishes["spinach-rice"]?.ingredients as Record<string, unknown>)[
      "ghee"
    ] = { amount: 5, unit: "g" };
    const en = pack.words["en"];
    if (en) en.ingredients["paneer"] = "Paneer";
    expect(packProblems(pack, sources)).toEqual([
      'test-kitchen/ingredients/paneer.json: neither a staple nor fresh. List it in staples.json, or add "keeps" with its FoodKeeper entry.',
      "test-kitchen/dishes/spinach-rice.json: uses ghee, which has no ingredients/ghee.json.",
    ]);
  });

  test("every dish, ingredient and part has a word in each of the pack's languages", () => {
    const pack = goodPack();
    pack.languages = ["en", "hi"];
    pack.words["hi"] = {
      dishes: { "spinach-rice": "पालक चावल" },
      ingredients: { spinach: "पालक", rice: "चावल" },
      parts: {},
    };
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/words/hi.json: no word for the part rice.",
    ]);
  });

  test("every ingredient has an amount per serving, in g, ml or pieces", () => {
    const pack = goodPack();
    (pack.dishes["spinach-rice"]?.ingredients as Record<string, unknown>)[
      "rice"
    ] = { amount: 0, unit: "cups" };
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/dishes/spinach-rice.json: rice needs an amount per serving above 0, in g, ml or pieces.",
    ]);
  });
});
