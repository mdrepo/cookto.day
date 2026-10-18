import { describe, expect, test } from "bun:test";
import {
  type AppPack,
  createChanges,
  createPantry,
  createSettings,
  createShopping,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import { keepMovedDishes } from "../src/kitchen.js";

// specs/147-packs.md, criterion 2: poha and bhel puri moved from North
// Indian to Maharashtrian. A household that loaded North Indian before
// gets Maharashtrian too, once; a new one doesn't.

const pack = (id: string): AppPack => ({
  id,
  dishes: [],
  fresh: {},
  staples: { "grains-and-dals": [], spices: [], basics: [] },
  sample: [],
  words: {},
});

function setUp(saved: Record<string, string>) {
  const changes = createChanges();
  const records = memoryRecordStore();
  const settings = createSettings(memoryKeyValue(saved), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  const k = {
    pantry: createPantry(records, { changes }),
    shopping: createShopping(records, { changes }),
    settings: settings.writer,
    packs: {
      cuisines: () =>
        ["north-indian", "maharashtrian"].map((id) => ({
          id,
          dishes: 1,
          soon: false,
        })),
      load: (id: string) => Promise.resolve(pack(id)),
    },
  };
  return { k, cuisines: () => settings.store.getState().kitchen.cuisines };
}

const before = {
  "cookto.day:kitchen": JSON.stringify({
    cuisines: ["north-indian"],
    skip: [],
    sample: null,
  }),
};

describe("dishes that moved pack", () => {
  test("a household that loaded North Indian before gets Maharashtrian too", async () => {
    const { k, cuisines } = setUp(before);
    await keepMovedDishes(k);
    expect(cuisines()).toEqual(["north-indian", "maharashtrian"]);
  });

  test("once: taking Maharashtrian away again sticks", async () => {
    const { k, cuisines } = setUp(before);
    await keepMovedDishes(k);
    k.settings.setKitchen({
      ...k.settings.kitchen(),
      cuisines: ["north-indian"],
    });
    await keepMovedDishes(k);
    expect(cuisines()).toEqual(["north-indian"]);
  });

  test("a new household that loads North Indian later doesn't", async () => {
    const { k, cuisines } = setUp({});
    await keepMovedDishes(k);
    k.settings.setKitchen({
      ...k.settings.kitchen(),
      cuisines: ["north-indian"],
    });
    await keepMovedDishes(k);
    expect(cuisines()).toEqual(["north-indian"]);
  });
});
