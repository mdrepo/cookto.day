import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createPlans,
  createSettings,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import {
  chooseBeans,
  keepTomorrow,
  prepDone,
  prepNotDone,
} from "../src/prep.js";

// specs/144-prep.md: tomorrow is planned tonight; prep is marked done, or a
// "No" in the morning moves the dish to tomorrow.

function setUp() {
  const changes = createChanges();
  const plans = createPlans(memoryRecordStore(), { changes });
  const settings = createSettings(memoryKeyValue(), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  return { plans, settings: settings.writer, store: settings.store };
}

const brief = (p: {
  on: string;
  slot: string;
  dish: string;
  prep: unknown;
}) => [p.on, p.slot, p.dish, p.prep];

describe("prep", () => {
  test("tomorrow's picks are kept, once, so tomorrow morning shows the same", async () => {
    const k = setUp();
    await keepTomorrow(k, "2026-10-19", { lunch: "chole", dinner: "dal" });
    await keepTomorrow(k, "2026-10-19", { lunch: "rajma" });
    expect((await k.plans.reader.all()).map(brief).sort()).toEqual([
      ["2026-10-19", "dinner", "dal", null],
      ["2026-10-19", "lunch", "chole", null],
    ]);
  });

  test("'Done' marks the prep, with the time", async () => {
    const k = setUp();
    await keepTomorrow(k, "2026-10-19", { lunch: "chole" });
    await prepDone(k, "2026-10-19", "lunch", "21:00");
    expect(await k.plans.reader.all()).toMatchObject([
      { dish: "chole", prep: "done", since: "21:00" },
    ]);
  });

  test("'No' in the morning: today's plan ends, and the dish is tomorrow's", async () => {
    const k = setUp();
    await keepTomorrow(k, "2026-10-19", { lunch: "chole" });
    await prepNotDone(k, "2026-10-19", "lunch");
    expect((await k.plans.reader.all()).map(brief).sort()).toEqual([
      ["2026-10-19", "lunch", "chole", "skipped"],
      ["2026-10-20", "lunch", "chole", null],
    ]);
  });

  test("beans: dried or tinned", () => {
    const k = setUp();
    chooseBeans(k, "tinned");
    expect(k.store.getState().beans).toBe("tinned");
  });
});
