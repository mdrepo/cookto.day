import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import {
  HOUSEHOLD_SETTINGS,
  HOUSEHOLD_SETTINGS_ID,
  shareSettings,
} from "../src/household-settings.js";
import { memoryKeyValue } from "../src/kv.js";
import { memoryRecordStore } from "../src/record-store.js";
import { createSettings } from "../src/settings.js";

// specs/240 (and #217's settings in two homes): kitchen, country, beans,
// the day that's sorted, the time zone, meal times and days off are one
// household record, synced like any other. A write saves it at its one id,
// one version up; a copy pulled from another phone lands in the settings
// without being saved back.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG", "IN"],
  fallbackCountry: "SG",
};
const T0 = "2026-10-20T19:00:00.000Z";

interface Stored {
  id: string;
  version: number;
  beans?: string;
  sorted?: string | null;
  country?: string;
  timeZone?: string | null;
  mealTimes?: Record<string, string>;
  daysOff?: { weekdays: number[]; dates: string[] };
}

function build(kv = memoryKeyValue(), store = memoryRecordStore()) {
  const changes = createChanges();
  const settings = createSettings(kv, options);
  const writer = shareSettings(settings, store, { changes, kv, now: () => T0 });
  const record = () =>
    store.get<Stored>(HOUSEHOLD_SETTINGS, HOUSEHOLD_SETTINGS_ID);
  return { kv, store, changes, settings, writer, record };
}

describe("the household's settings record", () => {
  test("a write saves it whole at its one id, one version up each time", async () => {
    const b = build();
    b.writer.setBeans("tinned");
    await b.writer.saved();
    expect(await b.record()).toMatchObject({
      id: "household",
      version: 1,
      beans: "tinned",
      country: "SG",
      sorted: null,
      timeZone: null,
      mealTimes: { lunch: "13:00", dinner: "20:00" },
      daysOff: { weekdays: [], dates: [] },
    });
    b.writer.setSorted("2026-10-21");
    b.writer.setMealTimes({
      ...b.settings.store.getState().mealTimes,
      lunch: "13:30",
    });
    await b.writer.saved();
    expect(await b.record()).toMatchObject({
      version: 3,
      sorted: "2026-10-21",
      mealTimes: { lunch: "13:30" },
    });
  });

  test("the time zone, meal times and days off are remembered", async () => {
    const b = build();
    b.writer.setTimeZone("Asia/Kolkata");
    b.writer.setDaysOff({ weekdays: [0], dates: ["2026-10-25"] });
    await b.writer.saved();
    const again = createSettings(b.kv, options).store.getState();
    expect(again.timeZone).toBe("Asia/Kolkata");
    expect(again.daysOff).toEqual({ weekdays: [0], dates: ["2026-10-25"] });
    expect(again.mealTimes.dinner).toBe("20:00");
    expect(b.writer.timeZone()).toBe("Asia/Kolkata");
  });

  test("a copy from another phone lands in the settings, not saved back", async () => {
    const b = build();
    const pulled = {
      id: "household",
      version: 4,
      updatedAt: T0,
      deletedAt: null,
      kitchen: { cuisines: ["north-indian"], skip: [], sample: null },
      country: "IN",
      beans: "tinned",
      sorted: "2026-10-21",
      timeZone: "Asia/Kolkata",
      mealTimes: { lunch: "13:30", dinner: "21:00" },
      daysOff: { weekdays: [6], dates: [] },
    };
    await b.store.put(HOUSEHOLD_SETTINGS, [pulled]);
    b.changes.announce("household-settings");
    await b.writer.saved();
    const s = b.settings.store.getState();
    expect(s.beans).toBe("tinned");
    expect(s.country).toBe("IN");
    expect(s.sorted).toBe("2026-10-21");
    expect(s.timeZone).toBe("Asia/Kolkata");
    expect(s.kitchen.cuisines).toEqual(["north-indian"]);
    // A meal the record doesn't name keeps its own time.
    expect(s.mealTimes).toMatchObject({ breakfast: "08:00", lunch: "13:30" });
    expect(s.daysOff).toEqual({ weekdays: [6], dates: [] });
    expect((await b.record())?.version).toBe(4);
    // And the phone remembers it, as if it had chosen it.
    expect(createSettings(b.kv, options).store.getState().beans).toBe("tinned");
  });

  test("ensure: a phone with no record saves one from what it has", async () => {
    const b = build();
    await b.writer.ensure();
    expect((await b.record())?.version).toBe(1);
    await b.writer.ensure();
    expect((await b.record())?.version).toBe(1);
  });
});
