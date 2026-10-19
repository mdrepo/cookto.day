import { describe, expect, test } from "bun:test";
import { memoryKeyValue } from "../src/kv.js";
import { createSettings } from "../src/settings.js";

// specs/207: the cook's Telegram, and what last went to her, are a setting
// of this phone, kept like the role: ready before the first draw, never
// synced.

const options = {
  languages: ["en"],
  fallback: "en",
  countries: ["SG"],
  fallbackCountry: "SG",
};

const PLAN = { on: "2026-10-21", text: "Tomorrow\nLunch: Chole" };

describe("the cook's settings", () => {
  test("no cook to start; a connected one is saved and comes back", () => {
    const kv = memoryKeyValue();
    const { store, writer } = createSettings(kv, options);
    expect(store.getState().cook).toBeNull();
    const cook = {
      token: "tok",
      connectedAt: "2026-10-20T11:00:00.000Z",
      sent: null,
      scheduled: null,
    };
    writer.setCook(cook);
    expect(createSettings(kv, options).store.getState().cook).toEqual(cook);
    writer.setCook(null);
    expect(createSettings(kv, options).store.getState().cook).toBeNull();
  });

  test("the plan sent, and the one waiting with its id, come back too", () => {
    const kv = memoryKeyValue();
    const { writer } = createSettings(kv, options);
    const cook = {
      token: "tok",
      connectedAt: "2026-10-20T11:00:00.000Z",
      sent: { ...PLAN, at: "x", id: null },
      scheduled: { ...PLAN, at: "y", id: "m-1" },
    };
    writer.setCook(cook);
    expect(createSettings(kv, options).store.getState().cook).toEqual(cook);
  });

  test("something saved that isn't what we save is ignored", () => {
    const broken = memoryKeyValue({ "cookto.day:cook": '{"token":1}' });
    expect(createSettings(broken, options).store.getState().cook).toBeNull();
    const junk = memoryKeyValue({ "cookto.day:cook": "not json" });
    expect(createSettings(junk, options).store.getState().cook).toBeNull();
    const odd = memoryKeyValue({
      "cookto.day:cook": JSON.stringify({
        token: "tok",
        connectedAt: "x",
        sent: "no",
      }),
    });
    expect(createSettings(odd, options).store.getState().cook).toEqual({
      token: "tok",
      connectedAt: "x",
      sent: null,
      scheduled: null,
    });
  });
});
