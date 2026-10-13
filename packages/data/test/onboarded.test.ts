import { describe, expect, test } from "bun:test";
import { memoryKeyValue, type KeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/65-onboarding.md, criterion 7: onboarding is asked once. Whether it's
// done is ready before the first draw, like the language.

const KEY = "cookto.day:onboarded";
const make = (kv: KeyValue) =>
  createSettings(kv, {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });

describe("the settings remember that onboarding is done", () => {
  test("a first visit hasn't done it", () => {
    expect(make(memoryKeyValue()).store.getState().onboarded).toBe(false);
  });

  test("once done, it's saved and stays done", () => {
    const kv = memoryKeyValue();
    const { store, writer } = make(kv);
    writer.setOnboarded();
    expect(store.getState().onboarded).toBe(true);
    expect(make(kv).store.getState().onboarded).toBe(true);
  });

  test("storage that throws still lets them in, this visit", () => {
    const broken: KeyValue = {
      get() {
        throw new Error("storage is off");
      },
      set() {
        throw new Error("storage is off");
      },
    };
    const { store, writer } = make(broken);
    writer.setOnboarded();
    expect(store.getState().onboarded).toBe(true);
  });

  test("it's saved under its own key", () => {
    const kv = memoryKeyValue();
    make(kv).writer.setOnboarded();
    expect(kv.get(KEY)).toBe("yes");
  });
});
