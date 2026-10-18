import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createPlans,
  createSettings,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import {
  chooseRole,
  didntMake,
  sortTomorrow,
  swapTomorrow,
} from "../src/who-cooks.js";

// specs/195-who-cooks.md: the role, "Looks good", a swap, "Didn't make it".

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

function kitchen() {
  const settings = createSettings(memoryKeyValue(), options);
  const plans = createPlans(memoryRecordStore(), { changes: createChanges() });
  return { settings, plans };
}

describe("who cooks", () => {
  test("the planner's phone, and the cook's", () => {
    const k = kitchen();
    chooseRole({ settings: k.settings.writer }, "plan");
    expect(k.settings.store.getState().role).toBe("plan");
    chooseRole({ settings: k.settings.writer }, "cook");
    expect(k.settings.store.getState().role).toBe("cook");
  });

  test("'Looks good' sorts tomorrow", () => {
    const k = kitchen();
    sortTomorrow({ settings: k.settings.writer }, "2026-10-19");
    expect(k.settings.store.getState().sorted).toBe("2026-10-19");
  });

  test("a swap is tomorrow's new pick", async () => {
    const k = kitchen();
    await k.plans.writer.plan("2026-10-19", "dinner", "chole");
    await swapTomorrow(k, "2026-10-19", "dinner", "rajma");
    expect((await k.plans.reader.all()).map((p) => p.dish)).toEqual(["rajma"]);
  });

  test("'Didn't make it' frees the dish", async () => {
    const k = kitchen();
    await k.plans.writer.plan("2026-10-17", "dinner", "dal-tadka");
    await didntMake(k, "2026-10-17", "dinner");
    expect((await k.plans.reader.all())[0]?.made).toBe("no");
  });
});
