import { describe, expect, test } from "bun:test";
import { memoryKeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/144-prep.md: dried or tinned beans, in Settings; dried to start.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

describe("beans", () => {
  test("dried to start; tinned is remembered", () => {
    const kv = memoryKeyValue();
    const first = createSettings(kv, options);
    expect(first.store.getState().beans).toBe("dried");
    first.writer.setBeans("tinned");
    expect(first.store.getState().beans).toBe("tinned");
    expect(createSettings(kv, options).store.getState().beans).toBe("tinned");
  });

  test("anything else saved reads as dried", () => {
    const kv = memoryKeyValue();
    kv.set("cookto.day:beans", "canned");
    expect(createSettings(kv, options).store.getState().beans).toBe("dried");
  });
});
