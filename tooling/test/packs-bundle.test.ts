import { describe, expect, test } from "bun:test";
import { bundlePack } from "../scripts/packs-bundle-lib.js";
import { type Pack, packProblems, type Sources } from "../scripts/packs-lib.js";

// specs/72-kitchen.md, step 3: the app loads a pack as one small file, keyed
// by Wikidata ids, only when a household picks its cuisine (ADR 0015, 0027).

const sources: Sources = {
  wikidata: { Q36814998: "spinach", Q5090: "rice" },
  foodkeeper: {
    "291": { name: "Lettuce, leaf, spinach", fridge: [3, 7], pantry: null },
  },
};

const pack: Pack = {
  id: "test-kitchen",
  languages: ["en"],
  parts: ["rice"],
  staples: { "grains-and-dals": ["rice"], spices: [], basics: [] },
  ingredients: {
    spinach: {
      wikidata: "Q36814998",
      label: "spinach",
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
  sample: [
    { ingredient: "spinach", amount: 250, unit: "g" },
    { ingredient: "rice" },
  ],
  words: {
    en: {
      dishes: { "spinach-rice": "Spinach rice" },
      ingredients: { spinach: "Spinach", rice: "Rice" },
      parts: { rice: "Rice" },
    },
  },
};

describe("a pack, as the app loads it", () => {
  test("ingredients are Wikidata ids; fresh food keeps its days; sources and amounts stay behind", () => {
    expect(bundlePack(pack)).toEqual({
      id: "test-kitchen",
      dishes: [
        {
          id: "spinach-rice",
          slots: ["lunch"],
          ingredients: ["Q36814998", "Q5090"],
          servedWith: ["rice"],
        },
      ],
      fresh: { Q36814998: 3 },
      staples: { "grains-and-dals": ["Q5090"], spices: [], basics: [] },
      sample: [
        { ingredient: "Q36814998", amount: 250, unit: "g" },
        { ingredient: "Q5090" },
      ],
      words: {
        en: {
          dishes: { "spinach-rice": "Spinach rice" },
          ingredients: { Q36814998: "Spinach", Q5090: "Rice" },
          parts: { rice: "Rice" },
        },
      },
    });
  });

  test("a sample item must be one of the pack's ingredients, with a real unit", () => {
    const bad: Pack = {
      ...pack,
      sample: [
        { ingredient: "mango", amount: 1, unit: "pieces" },
        { ingredient: "spinach", amount: 2, unit: "bunch" },
      ],
    };
    expect(packProblems(bad, sources)).toEqual([
      "test-kitchen/sample.json: mango has no ingredients/mango.json.",
      "test-kitchen/sample.json: spinach needs an amount above 0, in g, ml or pieces, or no amount.",
    ]);
  });
});
