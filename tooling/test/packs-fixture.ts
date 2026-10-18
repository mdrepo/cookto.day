import type { Pack, Sources } from "../scripts/packs-lib.js";

// A small, good pack for packs:check's tests: every rule passes on it, so a
// test breaks one thing and expects only that problem.

export const sources: Sources = {
  wikidata: { Q81464: "Spinacia oleracea", Q5090: "rice" },
  foodkeeper: {
    "291": { name: "Lettuce, leaf, spinach", fridge: [3, 7], pantry: null },
  },
};

/** Six short steps in our own words (specs/149). */
export const STEPS = [
  "Wash the rice.",
  "Boil it in twice its water.",
  "Wash the spinach.",
  "Chop it fine.",
  "Stir it into the rice.",
  "Cover and rest for five minutes.",
];

export function goodPack(): Pack {
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
export function withPhoto(): Pack {
  const pack = goodPack();
  (pack.dishes["spinach-rice"] as { photo?: unknown }).photo = {
    author: "A. Cook",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Spinach_rice.jpg",
  };
  pack.photos = { "spinach-rice": { large: 35_000, small: 6_000 } };
  return pack;
}
