import { describe, expect, test } from "bun:test";
import { memoryKeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/195-who-cooks.md: who this phone is for, the cook or the planner;
// the cook to start. And which day's plan was approved ("Looks good").

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

describe("who cooks", () => {
  test("the cook to start; the planner is remembered", () => {
    const kv = memoryKeyValue();
    const first = createSettings(kv, options);
    expect(first.store.getState().role).toBe("cook");
    first.writer.setRole("plan");
    expect(first.store.getState().role).toBe("plan");
    expect(createSettings(kv, options).store.getState().role).toBe("plan");
  });

  test("anything else saved reads as the cook", () => {
    const kv = memoryKeyValue();
    kv.set("cookto.day:role", "chef");
    expect(createSettings(kv, options).store.getState().role).toBe("cook");
  });

  test("the day whose plan was approved is remembered", () => {
    const kv = memoryKeyValue();
    const first = createSettings(kv, options);
    expect(first.store.getState().sorted).toBeNull();
    first.writer.setSorted("2026-10-19");
    expect(first.store.getState().sorted).toBe("2026-10-19");
    expect(createSettings(kv, options).store.getState().sorted).toBe(
      "2026-10-19",
    );
  });
});
