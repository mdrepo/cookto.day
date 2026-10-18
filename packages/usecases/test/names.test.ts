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
import { addFood } from "../src/kitchen.js";

// specs/148-food-names.md: food typed by any of its names lands as that food.

const SPINACH = "Q1";
const OKRA = "Q2";
const pack: AppPack = {
  id: "test-kitchen",
  dishes: [],
  fresh: { [SPINACH]: 3, [OKRA]: 4 },
  staples: { "grains-and-dals": [], spices: [], basics: [] },
  sample: [],
  words: {
    en: {
      dishes: {},
      ingredients: { [SPINACH]: "Spinach", [OKRA]: "Okra" },
      parts: {},
    },
  },
  names: {
    spinach: SPINACH,
    palak: SPINACH,
    okra: OKRA,
    bhindi: OKRA,
    "ladies finger": OKRA,
  },
};

function setUp() {
  const changes = createChanges();
  const records = memoryRecordStore();
  const settings = createSettings(
    memoryKeyValue({
      "cookto.day:kitchen": JSON.stringify({
        cuisines: ["test-kitchen"],
        skip: [],
        sample: null,
      }),
    }),
    {
      languages: ["en"],
      fallback: "en",
      countries: ["SG"],
      fallbackCountry: "SG",
    },
  );
  return {
    pantry: createPantry(records, { changes }),
    shopping: createShopping(records, { changes }),
    settings: settings.writer,
    packs: {
      cuisines: () => [{ id: "test-kitchen", dishes: 0, soon: false }],
      load: () => Promise.resolve(pack),
    },
  };
}

describe("food by its names", () => {
  test("palak is spinach, and a shop's LADIES FINGER 250G is okra", async () => {
    const k = setUp();
    for (const name of ["palak", "LADIES FINGER 250G", "Bhindi"])
      await addFood(k, { name, boughtOn: "2026-10-18" }, "en");
    expect(
      (await k.pantry.reader.items()).map((i) => [
        i.ingredient,
        i.shelfLifeDays,
      ]),
    ).toEqual([
      [SPINACH, 3],
      [OKRA, 4],
      [OKRA, 4],
    ]);
  });
});
