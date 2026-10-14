import { describe, expect, test } from "bun:test";
import { memoryKeyValue, type KeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/51-settings.md, criterion 1: the settings remember the language.

const LANGUAGES = ["en", "hi", "mr", "ar"] as const;
const KEY = "cookto.day:language";
const make = (kv: KeyValue) =>
  createSettings(kv, {
    languages: LANGUAGES,
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });

/** A store that throws on every call, as browsers do in some private modes. */
const broken: KeyValue = {
  get() {
    throw new Error("storage is off");
  },
  set() {
    throw new Error("storage is off");
  },
};

describe("the settings remember the language", () => {
  test("a saved language is read before anything draws", () => {
    const { store } = make(memoryKeyValue({ [KEY]: "mr" }));
    expect(store.getState().language).toBe("mr");
  });

  test.each([
    ["an unknown saved language", memoryKeyValue({ [KEY]: "xx" })],
    ["no saved language", memoryKeyValue()],
    ["storage that throws", broken],
  ])("with %s, it's English", (_, kv) => {
    expect(make(kv).store.getState().language).toBe("en");
  });

  test("writing a language saves it and updates the store", () => {
    const kv = memoryKeyValue();
    const { store, writer } = make(kv);
    writer.setLanguage("hi");
    expect(kv.get(KEY)).toBe("hi");
    expect(store.getState().language).toBe("hi");
  });

  test("the store changes even when saving throws", () => {
    const { store, writer } = make(broken);
    writer.setLanguage("ar");
    expect(store.getState().language).toBe("ar");
  });

  test("the writer knows which languages the app speaks", () => {
    const { writer } = make(memoryKeyValue());
    expect(writer.speaks("hi")).toBe(true);
    expect(writer.speaks("xx")).toBe(false);
  });
});

describe("the settings remember the theme (#96)", () => {
  test("the phone's theme until one is chosen, then the chosen one, saved", () => {
    const kv = memoryKeyValue();
    expect(make(kv).store.getState().theme).toBe("system");
    make(kv).writer.setTheme("dark");
    expect(make(kv).store.getState().theme).toBe("dark");
  });

  test("a saved theme it doesn't know is the phone's", () => {
    const { store } = make(memoryKeyValue({ "cookto.day:theme": "purple" }));
    expect(store.getState().theme).toBe("system");
  });
});
