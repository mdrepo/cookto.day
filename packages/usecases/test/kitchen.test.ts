import { describe, expect, test } from "bun:test";
import {
  type AppPack,
  createChanges,
  createPantry,
  createSettings,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import {
  addFood,
  addStaples,
  changeAmount,
  clearSample,
  loadCuisine,
  markFood,
  setMakes,
  trySample,
  useUp,
} from "../src/kitchen.js";

// specs/72-kitchen.md, criteria 1 to 5, 8 and 9, on the memory repositories
// and a small pack (ADR 0027). Ids are made up: use cases know no cuisine.

const SPINACH = "Q1";
const RICE = "Q2";
const pack: AppPack = {
  id: "test-kitchen",
  dishes: [
    {
      id: "spinach-rice",
      slots: ["lunch"],
      ingredients: [SPINACH, RICE],
      servedWith: ["roti", "rice"],
    },
  ],
  fresh: { [SPINACH]: 3 },
  staples: { "grains-and-dals": [RICE], spices: [], basics: [] },
  sample: [
    { ingredient: SPINACH, amount: 250, unit: "g" },
    { ingredient: RICE },
  ],
  words: {
    en: {
      dishes: { "spinach-rice": "Spinach rice" },
      ingredients: { [SPINACH]: "Spinach", [RICE]: "Rice" },
      parts: { roti: "Roti", rice: "Rice" },
    },
    hi: {
      dishes: { "spinach-rice": "पालक चावल" },
      ingredients: { [SPINACH]: "पालक", [RICE]: "चावल" },
      parts: { roti: "रोटी", rice: "चावल" },
    },
  },
};

function setUp() {
  const pantry = createPantry(memoryRecordStore(), {
    changes: createChanges(),
  });
  const { store, writer: settings } = createSettings(memoryKeyValue(), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  const packs = {
    cuisines: () => [
      { id: "test-kitchen", dishes: 1, soon: false },
      { id: "later", dishes: 0, soon: true },
    ],
    load: (id: string) =>
      id === "test-kitchen"
        ? Promise.resolve(pack)
        : Promise.reject(new Error(`No pack "${id}" to load yet.`)),
  };
  const kitchen = { pantry, settings, packs };
  return {
    kitchen,
    items: () => pantry.reader.items(),
    state: () => store.getState().kitchen,
  };
}

const today = "2026-10-13";

describe("the kitchen", () => {
  test("loading a cuisine adds it once; one that's coming soon doesn't load", async () => {
    const { kitchen, state } = setUp();
    await loadCuisine(kitchen, "test-kitchen");
    await loadCuisine(kitchen, "test-kitchen");
    await loadCuisine(kitchen, "later");
    expect(state().cuisines).toEqual(["test-kitchen"]);
  });

  test("ticked staples come in as 'have it', once each", async () => {
    const { kitchen, items } = setUp();
    await addStaples(kitchen, [RICE], today);
    await addStaples(kitchen, [RICE], today);
    expect((await items()).map((i) => [i.ingredient, i.boughtOn])).toEqual([
      [RICE, today],
    ]);
    expect((await items())[0]).not.toHaveProperty("amount");
  });

  test("fresh food a loaded cuisine knows gets its id and shelf life, in any case", async () => {
    const { kitchen, items } = setUp();
    await loadCuisine(kitchen, "test-kitchen");
    await addFood(
      kitchen,
      { name: " spinach ", amount: 250, unit: "g", boughtOn: today },
      "en",
    );
    expect((await items())[0]).toMatchObject({
      ingredient: SPINACH,
      amount: 250,
      unit: "g",
      shelfLifeDays: 3,
    });
  });

  test("a name in the app's language counts too; an unknown name is kept as typed, with no use-by", async () => {
    const { kitchen, items } = setUp();
    await loadCuisine(kitchen, "test-kitchen");
    await addFood(kitchen, { name: "पालक", boughtOn: today }, "hi");
    await addFood(kitchen, { name: "Dragon fruit", boughtOn: today }, "en");
    const [palak, dragon] = await items();
    expect(palak?.ingredient).toBe(SPINACH);
    expect(dragon?.ingredient).toBe("Dragon fruit");
    expect(dragon).not.toHaveProperty("shelfLifeDays");
  });

  test("an amount changes, a mark is kept, and used up leaves", async () => {
    const { kitchen, items } = setUp();
    await addFood(
      kitchen,
      { name: "Paneer", amount: 200, unit: "g", boughtOn: today },
      "en",
    );
    const id = (await items())[0]?.id ?? "";
    await changeAmount(kitchen, id, 100, "g");
    await markFood(kitchen, id, "past-its-best");
    expect((await items())[0]).toMatchObject({
      amount: 100,
      mark: "past-its-best",
    });
    await useUp(kitchen, id);
    expect(await items()).toEqual([]);
  });

  test("what the household doesn't make is a setting it can turn back on", async () => {
    const { kitchen, state } = setUp();
    await setMakes(kitchen, "roti", false);
    await setMakes(kitchen, "roti", false);
    expect(state().skip).toEqual(["roti"]);
    await setMakes(kitchen, "roti", true);
    expect(state().skip).toEqual([]);
  });

  test("a sample kitchen loads the cuisine and fills the pantry; clearing it puts things back", async () => {
    const { kitchen, items, state } = setUp();
    await addFood(kitchen, { name: "Onions", boughtOn: today }, "en");
    await trySample(kitchen, "test-kitchen", today);
    expect(state().cuisines).toEqual(["test-kitchen"]);
    expect(state().sample).toEqual({ addedCuisines: ["test-kitchen"] });
    expect((await items()).map((i) => [i.ingredient, i.sample])).toEqual([
      ["Onions", false],
      [SPINACH, true],
      [RICE, true],
    ]);
    expect((await items())[1]).toMatchObject({ amount: 250, shelfLifeDays: 3 });

    await clearSample(kitchen);
    expect(state()).toEqual({ cuisines: [], skip: [], sample: null });
    expect((await items()).map((i) => i.ingredient)).toEqual(["Onions"]);
  });

  test("clearing a sample keeps a cuisine the household had loaded itself", async () => {
    const { kitchen, state } = setUp();
    await loadCuisine(kitchen, "test-kitchen");
    await trySample(kitchen, "test-kitchen", today);
    await trySample(kitchen, "test-kitchen", today);
    await clearSample(kitchen);
    expect(state().cuisines).toEqual(["test-kitchen"]);
  });
});
