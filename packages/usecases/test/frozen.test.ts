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

// specs/149-recipes.md, criterion 4: frozen food keeps its freezer time.

const PEAS = "Q1";
const pack: AppPack = {
  id: "test-kitchen",
  dishes: [],
  fresh: { [PEAS]: 3 },
  frozen: { [PEAS]: 90 },
  staples: { "grains-and-dals": [], spices: [], basics: [] },
  sample: [],
  words: {
    en: { dishes: {}, ingredients: { [PEAS]: "Green peas" }, parts: {} },
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

describe("frozen food", () => {
  test("frozen peas keep 3 months; fresh ones 3 days", async () => {
    const k = setUp();
    await addFood(
      k,
      { name: "Green peas", boughtOn: "2026-10-18", frozen: true },
      "en",
    );
    await addFood(k, { name: "Green peas", boughtOn: "2026-10-18" }, "en");
    const items = await k.pantry.reader.items();
    expect(items.map((i) => [i.frozen ?? false, i.shelfLifeDays])).toEqual([
      [true, 90],
      [false, 3],
    ]);
  });
});
