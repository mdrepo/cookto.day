import { describe, expect, test } from "bun:test";
import type { SettingsWriter } from "@cookto/data/write";
import { chooseLanguage } from "../src/settings.js";

// specs/51-settings.md, criterion 2: choosing a language is a use case. A
// fake writer stands in for the data layer (ADR 0022).

function fakeSettings(languages: string[]) {
  const written: string[] = [];
  const settings: SettingsWriter = {
    speaks: (language) => languages.includes(language),
    setLanguage: (language) => {
      written.push(language);
    },
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
