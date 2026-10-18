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

/** Six short steps in our own words (specs/149). */
const STEPS = [
  "Wash the rice.",
  "Boil it in twice its water.",
  "Wash the spinach.",
  "Chop it fine.",
  "Stir it into the rice.",
  "Cover and rest for five minutes.",
];

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
        sources: [
          "https://example.com/spinach-rice",
          "https://example.org/palak-rice",
        ],
        steps: STEPS,
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

/** goodPack, with a credited photo whose files are small enough (#118). */
function withPhoto(): Pack {
  const pack = goodPack();
  (pack.dishes["spinach-rice"] as { photo?: unknown }).photo = {
    author: "A. Cook",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Spinach_rice.jpg",
  };
  pack.photos = { "spinach-rice": { large: 35_000, small: 6_000 } };
  return pack;
}

describe("packs:check", () => {
  test("a pack with sources, matching ids and cited shelf lives passes", () => {
    expect(packProblems(goodPack(), sources)).toEqual([]);
  });

  test("a dish without a source fails, saying how to fix it", () => {
    const pack = goodPack();
    delete (pack.dishes["spinach-rice"] as { sources?: string[] }).sources;
    expect(packProblems(pack, sources)).toEqual([
      'test-kitchen/dishes/spinach-rice.json: no sources. Add "sources": the https links of two or three full recipes you read, or "cooked at home by <reviewer>".',
    ]);
    const pack2 = goodPack();
    (pack2.dishes["spinach-rice"] as { sources: string[] }).sources = [
      "my memory",
    ];
    expect(packProblems(pack2, sources)[0]).toContain("no sources");
  });

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

  test("an id whose Wikidata label names something else fails", () => {
    const pack = goodPack();
    pack.ingredients.spinach = {
      ...pack.ingredients.spinach,
      label: "spinach",
    } as Pack["ingredients"][string];
    expect(packProblems(pack, sources)).toEqual([
      'ingredients/spinach.json: Wikidata calls Q81464 "Spinacia oleracea", not "spinach". Check the id on wikidata.org, then copy its English label exactly.',
    ]);
  });

  test("an id missing from the stored copy fails, saying to refresh it", () => {
    const pack = goodPack();
    pack.ingredients.spinach = {
      ...pack.ingredients.spinach,
      wikidata: "Q999999999",
    } as Pack["ingredients"][string];
    expect(packProblems(pack, sources)).toEqual([
      "ingredients/spinach.json: Q999999999 isn't in packs/sources/wikidata.json. Run `bun run packs:refresh`; if it still isn't there, the id doesn't exist.",
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
      'ingredients/spinach.json: its shelf life cites no FoodKeeper entry. Add "foodkeeper": the entry\'s ID from packs/sources/foodkeeper.json.',
    ]);

    const tooLong = goodPack();
    tooLong.ingredients.spinach = {
      wikidata: "Q81464",
      label: "Spinacia oleracea",
      keeps: { days: 10, in: "fridge", foodkeeper: 291 },
    };
    expect(packProblems(tooLong, sources)).toEqual([
      "ingredients/spinach.json: keeps 10 days in the fridge, but FoodKeeper 291 (Lettuce, leaf, spinach) says 3 to 7. Use a number in that range.",
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
      'ingredients/paneer.json: neither a staple nor fresh. List it in staples.json, or add "keeps" with its FoodKeeper entry.',
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

  test("a photo needs its author, a free licence and its Commons page (#118)", () => {
    const pack = withPhoto();
    (pack.dishes["spinach-rice"] as { photo?: unknown }).photo = {
      author: "",
      licence: "CC BY-NC 4.0",
      source: "https://example.com/spinach.jpg",
    };
    const at = "test-kitchen/dishes/spinach-rice.json";
    expect(packProblems(pack, sources)).toEqual([
      `${at}: its photo has no author. Copy "Author" from its Commons page.`,
      `${at}: its photo's licence, CC BY-NC 4.0, isn't one we can use. Pick a photo in the public domain, or under CC0, CC BY or CC BY-SA.`,
      `${at}: its photo's "source" must be its page on commons.wikimedia.org.`,
    ]);
  });

  test("photos stay small, and every photo is credited (#118)", () => {
    const pack = withPhoto();
    pack.photos = {
      "spinach-rice": { large: 41_000, small: 9_000 },
      "no-dish": { large: 1_000, small: 1_000 },
    };
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/photos/spinach-rice.webp: 41 KB, over 40 KB. Make it smaller.",
      "test-kitchen/photos/spinach-rice.small.webp: 9 KB, over 8 KB. Make it smaller.",
      'test-kitchen/photos/no-dish.webp: no dish credits it. Add "photo" to its dish, or remove the files.',
    ]);
  });

  test("a credited photo needs its files (#118)", () => {
    const pack = withPhoto();
    expect(packProblems(pack, sources)).toEqual([]);
    pack.photos = {};
    expect(packProblems(pack, sources)).toEqual([
      "test-kitchen/dishes/spinach-rice.json: its photo has no files. Add photos/spinach-rice.webp and photos/spinach-rice.small.webp.",
    ]);
  });
});
