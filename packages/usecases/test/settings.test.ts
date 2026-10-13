import { describe, expect, test } from "bun:test";
import type { SettingsWriter } from "@cookto/data/write";
import { chooseCountry, chooseLanguage } from "../src/settings.js";

// specs/51-settings.md, criterion 2: choosing a language is a use case. A
// fake writer stands in for the data layer (ADR 0022).

function fakeSettings(languages: string[], countries: string[] = []) {
  const written: string[] = [];
  const settings: SettingsWriter = {
    speaks: (language) => languages.includes(language),
    setLanguage: (language) => {
      written.push(language);
    },
    knowsCountry: (country) => countries.includes(country),
    setCountry: (country) => {
      written.push(country);
    },
    setOnboarded: () => undefined,
  };
  return { settings, written };
}

describe("choosing a language", () => {
  test("a language the app speaks is written", () => {
    const { settings, written } = fakeSettings(["en", "hi"]);
    expect(chooseLanguage({ settings }, "hi")).toBe(true);
    expect(written).toEqual(["hi"]);
  });

  test("a language the app doesn't speak writes nothing", () => {
    const { settings, written } = fakeSettings(["en", "hi"]);
    expect(chooseLanguage({ settings }, "xx")).toBe(false);
    expect(written).toEqual([]);
  });
});

// specs/65-onboarding.md: choosing where you live is a use case too.

describe("choosing a country", () => {
  test("an open country is written", () => {
    const { settings, written } = fakeSettings([], ["SG"]);
    expect(chooseCountry({ settings }, "SG")).toBe(true);
    expect(written).toEqual(["SG"]);
  });

  test("a country that's coming soon writes nothing", () => {
    const { settings, written } = fakeSettings([], ["SG"]);
    expect(chooseCountry({ settings }, "IN")).toBe(false);
    expect(written).toEqual([]);
  });
});
