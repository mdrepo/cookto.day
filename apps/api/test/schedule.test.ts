import { describe, expect, test } from "bun:test";
import { push } from "../src/household/sync.js";
import { clockOf, schedule } from "../src/household/schedule.js";
import { as, home } from "./household-flow.js";
import { record } from "./household-support.js";
import { harness } from "./messenger-support.js";

// specs/240, criterion 6: the server reads a household's schedule from its
// synced records, and never writes it. A household with no settings record
// has no clock, so nothing is ever due for it.

const SETTINGS = record("household-settings", "household", {
  kitchen: { cuisines: ["north-indian"], skip: [], sample: null },
  country: "IN",
  beans: "dried",
  sorted: null,
  timeZone: "Asia/Kolkata",
  mealTimes: {
    breakfast: "08:00",
    "morning-snack": "11:00",
    lunch: "13:00",
    "evening-snack": "17:00",
    dinner: "21:00",
  },
  daysOff: { weekdays: [0], dates: [] },
});
const ADULT = record("members", "m-1", {
  kind: "adult",
  meals: ["lunch", "dinner"],
});
const ANOTHER = record("members", "m-2", {
  kind: "adult",
  meals: ["dinner"],
});

describe("6. the server's schedule", () => {
  test("its time zone, its meal times, the slots it eats, and the days off", async () => {
    const h = harness();
    const { session, id } = await home(h);
    await push(
      as(session, "POST", "/api/sync/push", {
        records: [SETTINGS, ADULT, ANOTHER],
      }),
      h.deps,
    );
    const s = await schedule(h.deps.households, id);
    expect(s.timeZone).toBe("Asia/Kolkata");
    expect(s.mealTimes.lunch).toBe("13:00");
    expect(s.mealTimes.dinner).toBe("21:00");
    expect(s.slots).toEqual(["lunch", "dinner"]);
    expect(s.daysOff).toEqual({ weekdays: [0], dates: [] });
    // 16:30 UTC is 22:00 in Kolkata.
    expect(clockOf(s, "2026-10-21T16:30:00.000Z")).toEqual({
      day: "2026-10-21",
      time: "22:00",
    });
    // Nothing was written back.
    expect(
      h.households.records.filter((r) => r.collection === "household-settings"),
    ).toHaveLength(1);
    expect(
      h.households.records.find((r) => r.id === "household")?.record.version,
    ).toBe(1);
  });

  test("a household with no settings record: no time zone, and no clock", async () => {
    const h = harness();
    const { session, id } = await home(h);
    await push(
      as(session, "POST", "/api/sync/push", { records: [ADULT] }),
      h.deps,
    );
    const s = await schedule(h.deps.households, id);
    expect(s.timeZone).toBeNull();
    expect(s.mealTimes.lunch).toBe("13:00");
    expect(s.slots).toEqual(["lunch", "dinner"]);
    expect(clockOf(s, "2026-10-21T16:30:00.000Z")).toBeNull();
  });

  test("a person deleted on a phone eats nothing", async () => {
    const h = harness();
    const { session, id } = await home(h);
    const gone = record("members", "m-1", {
      kind: "adult",
      meals: ["lunch", "dinner"],
      deletedAt: "2026-10-20T20:00:00.000Z",
    });
    await push(
      as(session, "POST", "/api/sync/push", {
        records: [SETTINGS, gone, ANOTHER],
      }),
      h.deps,
    );
    expect((await schedule(h.deps.households, id)).slots).toEqual(["dinner"]);
  });
});
