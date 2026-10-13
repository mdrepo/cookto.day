import { describe, expect, test } from "bun:test";
import { COUNTRIES, openCountries } from "../src/places.js";

// specs/65-onboarding.md, criterion 1: where people live sets the currency and
// the shops. Singapore first; India and the UAE are coming soon.

describe("where people live", () => {
  test("Singapore is open, in S$, with the shops people there use", () => {
    expect(COUNTRIES.SG.soon).toBe(false);
    expect(COUNTRIES.SG.currency).toBe("S$");
    expect(COUNTRIES.SG.shops).toEqual([
      "RedMart",
      "GrabMart",
      "foodpanda mart",
      "Cold Storage",
      "Sheng Siong",
    ]);
  });

  test("India and the United Arab Emirates are coming soon", () => {
    expect(COUNTRIES.IN.soon).toBe(true);
    expect(COUNTRIES.AE.soon).toBe(true);
  });

  test("only the open countries can be chosen", () => {
    expect(openCountries()).toEqual(["SG"]);
  });
});
