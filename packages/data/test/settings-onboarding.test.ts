import { describe, expect, test } from "bun:test";
import { memoryKeyValue, type KeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/65-onboarding.md: the settings for languages that are coming soon,
// and for where the household lives.

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

// specs/65-onboarding.md, criterion 2: English to start, other languages
// coming soon, and a preview for reviewers.

describe("languages that are coming soon", () => {
  const soon = (kv: KeyValue, preview: string | null = null) =>
    createSettings(kv, {
      languages: ["en"],
      previews: ["en", "hi", "mr", "ar"],
      preview,
      fallback: "en",
      countries: ["SG"],
      fallbackCountry: "SG",
    });

  test("a preview shows a coming-soon language, without choosing or saving it", () => {
    const kv = memoryKeyValue();
    const { store, writer } = soon(kv, "ar");
    expect(store.getState().language).toBe("ar");
    expect(writer.speaks("ar")).toBe(false);
    expect(kv.get(KEY)).toBeNull();
    // A language the app doesn't have can't be previewed.
    expect(soon(memoryKeyValue(), "xx").store.getState().language).toBe("en");
  });

  test("a preview wins over the saved language, and leaves it saved", () => {
    const kv = memoryKeyValue({ [KEY]: "en" });
    expect(soon(kv, "hi").store.getState().language).toBe("hi");
    expect(kv.get(KEY)).toBe("en");
  });
});

// specs/65-onboarding.md, step 2 of "How it lands": the household's country.

describe("the settings remember the country", () => {
  const COUNTRY = "cookto.day:country";

  test("with nothing saved, it's the first open country", () => {
    expect(make(memoryKeyValue()).store.getState().country).toBe("SG");
  });

  test.each([
    ["a country that isn't open", memoryKeyValue({ [COUNTRY]: "IN" })],
    ["storage that throws", broken],
  ])("with %s, it's the fallback", (_, kv) => {
    expect(make(kv).store.getState().country).toBe("SG");
  });

  test("a saved country is read before anything draws", () => {
    const kv = memoryKeyValue({ [COUNTRY]: "AE" });
    const { store } = createSettings(kv, {
      languages: LANGUAGES,
      fallback: "en",
      countries: ["SG", "AE"],
      fallbackCountry: "SG",
    });
    expect(store.getState().country).toBe("AE");
  });

  test("writing a country saves it and updates the store", () => {
    const kv = memoryKeyValue();
    const { store, writer } = make(kv);
    writer.setCountry("SG");
    expect(kv.get(COUNTRY)).toBe("SG");
    expect(store.getState().country).toBe("SG");
  });

  test("the writer knows which countries are open", () => {
    const { writer } = make(memoryKeyValue());
    expect(writer.knowsCountry("SG")).toBe(true);
    expect(writer.knowsCountry("IN")).toBe(false);
  });
});
