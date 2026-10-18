import { describe, expect, test } from "bun:test";
import {
  type AppPack,
  createChanges,
  createCooked,
  createPantry,
  createSettings,
  createShopping,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import { cookedIt, notCooked } from "../src/cooked.js";
import { bringBack, loadCuisine, useUp } from "../src/kitchen.js";
import { chooseTheme } from "../src/settings.js";
import {
  addBoughtFood,
  addToList,
  addTypedToList,
  bought,
} from "../src/shopping.js";

// The use cases that had no test (the code review of 17 Oct): the shopping
// list (specs/103, 113), Undo (#116), "We cooked this" (specs/104) and the
// theme (specs/96), on the memory repositories. Ids are made up.

const SPINACH = "Q1";
const ONION = "Q2";
const pack: AppPack = {
  id: "test-kitchen",
  dishes: [],
  fresh: { [SPINACH]: 3, [ONION]: 20 },
  staples: { "grains-and-dals": [], spices: [], basics: [] },
  sample: [],
  words: {
    en: {
      dishes: {},
      ingredients: { [SPINACH]: "Spinach", [ONION]: "Onion" },
      parts: {},
    },
  },
};

const today = "2026-10-18";

async function setUp() {
  const store = memoryRecordStore();
  const changes = createChanges();
  const pantry = createPantry(store, { changes });
  const shopping = createShopping(store, { changes });
  const cooked = createCooked(store, {
    changes,
    now: () => "2026-10-18T08:00:00.000Z",
  });
  const settings = createSettings(memoryKeyValue(), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  const packs = {
    cuisines: () => [{ id: "test-kitchen", dishes: 0, soon: false }],
    load: () => Promise.resolve(pack),
  };
  const k = { pantry, shopping, settings: settings.writer, packs, cooked };
  await loadCuisine(k, "test-kitchen");
  return {
    k,
    settings,
    list: async () => (await shopping.reader.items()).map((i) => i.ingredient),
    fridge: () => pantry.reader.items(),
    cookedOn: async (day: string) =>
      (await cooked.reader.all())
        .filter((c) => c.on === day)
        .map((c) => c.dish),
  };
}

describe("the shopping list", () => {
  test("what a dish needs goes on once, and says how many were new", async () => {
    const { k, list } = await setUp();
    expect(await addToList(k, [ONION, SPINACH])).toBe(2);
    expect(await addToList(k, [ONION])).toBe(0);
    expect(await list()).toEqual([ONION, SPINACH]);
  });

  test("typed words go on as typed, and blank ones don't", async () => {
    const { k, list } = await setUp();
    await addTypedToList(k, "  dish soap ");
    await addTypedToList(k, "   ");
    expect(await list()).toEqual(["dish soap"]);
  });

  test("ticked off: off the list, into the fridge, bought today, with its shelf life", async () => {
    const { k, list, fridge } = await setUp();
    await addToList(k, [ONION, SPINACH]);
    const [onion] = await k.shopping.reader.items();
    if (!onion) throw new Error("the list is empty");
    await bought(k, onion, today, "en");
    expect(await list()).toEqual([SPINACH]);
    expect(await fridge()).toMatchObject([
      { ingredient: ONION, boughtOn: today, shelfLifeDays: 20 },
    ]);
  });

  test("tapped as bought: into the fridge that day, and off the list", async () => {
    const { k, list, fridge } = await setUp();
    await addToList(k, [SPINACH, ONION]);
    await addBoughtFood(k, [SPINACH], "2026-10-17", "en");
    expect(await list()).toEqual([ONION]);
    expect(await fridge()).toMatchObject([
      { ingredient: SPINACH, boughtOn: "2026-10-17", shelfLifeDays: 3 },
    ]);
  });
});

describe("undo, and what was cooked", () => {
  test("used up, then brought back: as it was", async () => {
    const { k, fridge } = await setUp();
    await k.pantry.writer.add([
      { ingredient: ONION, boughtOn: "2026-10-16", amount: 1000, unit: "g" },
    ]);
    const [before] = await fridge();
    if (!before) throw new Error("nothing in the fridge");
    await useUp(k, before.id);
    expect(await fridge()).toEqual([]);
    await bringBack(k, before.id);
    expect(await fridge()).toMatchObject([
      { ingredient: ONION, boughtOn: "2026-10-16", amount: 1000, unit: "g" },
    ]);
  });

  test("cooked today, then not after all", async () => {
    const { k, cookedOn } = await setUp();
    await cookedIt(k, "palak-paneer", today);
    expect(await cookedOn(today)).toEqual(["palak-paneer"]);
    await notCooked(k, "palak-paneer", today);
    expect(await cookedOn(today)).toEqual([]);
  });

  test("the theme is remembered", async () => {
    const { settings } = await setUp();
    chooseTheme({ settings: settings.writer }, "dark");
    expect(settings.store.getState().theme).toBe("dark");
  });
});
