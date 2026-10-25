import { describe, expect, test } from "bun:test";
import {
  type AppPack,
  createChanges,
  createPantry,
  createSettings,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import { chooseCuisine } from "../src/kitchen.js";

// specs/263, criterion 2 on a phone: ticks come faster than packs load. Two
// quick ticks keep both, and unticking one while it loads leaves it off.
// The deploy's Android run lost the first tick this way.

/** Packs that load only when the test says, as a slow phone would. */
function slowPacks() {
  const waiting = new Map<string, () => void>();
  return {
    cuisines: () => [
      { id: "north", dishes: 1, soon: false },
      { id: "west", dishes: 1, soon: false },
    ],
    load: (id: string) =>
      new Promise<AppPack>((done) => {
        waiting.set(id, () => {
          done({ id } as AppPack);
        });
      }),
    finish: () => {
      for (const done of waiting.values()) done();
    },
  };
}

function setUp() {
  const { store, writer: settings } = createSettings(memoryKeyValue(), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  const packs = slowPacks();
  const pantry = createPantry(memoryRecordStore(), {
    changes: createChanges(),
  });
  return {
    kitchen: { pantry, settings, packs },
    packs,
    cuisines: () => store.getState().kitchen.cuisines,
  };
}

describe("ticking cuisines faster than they load", () => {
  test("two quick ticks keep both; unticking one as it loads leaves it off", async () => {
    const { kitchen, packs, cuisines } = setUp();
    const north = chooseCuisine(kitchen, "north", true);
    const west = chooseCuisine(kitchen, "west", true);
    expect(cuisines()).toEqual(["north", "west"]);
    const off = chooseCuisine(kitchen, "west", false);
    packs.finish();
    await Promise.all([north, west, off]);
    expect(cuisines()).toEqual(["north"]);
  });
});
