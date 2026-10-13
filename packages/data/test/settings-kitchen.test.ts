import { describe, expect, test } from "bun:test";
import { memoryKeyValue, type KeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/72-kitchen.md, criteria 1, 8 and 9: the cuisines a household loads,
// what it doesn't make, and whether a sample kitchen is in (ADR 0027).

const make = (kv: KeyValue) =>
  createSettings(kv, {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });

describe("the kitchen's settings", () => {
  test("start empty", () => {
    const { store } = make(memoryKeyValue());
    expect(store.getState().kitchen).toEqual({
      cuisines: [],
      skip: [],
      sample: null,
    });
  });

  test("are remembered after a reload", () => {
    const kv = memoryKeyValue();
    const { writer } = make(kv);
    writer.setKitchen({
      cuisines: ["north-indian"],
      skip: ["roti"],
      sample: { addedCuisines: ["north-indian"] },
    });
    expect(make(kv).store.getState().kitchen).toEqual({
      cuisines: ["north-indian"],
      skip: ["roti"],
      sample: { addedCuisines: ["north-indian"] },
    });
    expect(make(kv).writer.kitchen().skip).toEqual(["roti"]);
  });

  test("something unreadable in storage starts empty instead of breaking", () => {
    const kv = memoryKeyValue();
    kv.set("cookto.day:kitchen", "{not json");
    expect(make(kv).store.getState().kitchen.cuisines).toEqual([]);
    kv.set("cookto.day:kitchen", JSON.stringify({ cuisines: "north-indian" }));
    expect(make(kv).store.getState().kitchen.cuisines).toEqual([]);
  });
});
