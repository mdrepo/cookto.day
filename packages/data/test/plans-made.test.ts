import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/195-who-cooks.md: a planned meal counts as made unless someone says
// "Didn't make it"; and tomorrow's pick can be swapped for another idea.

function setUp() {
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const plans = createPlans(memoryRecordStore(), {
    changes,
    now: () => "2026-10-18T19:00:00.000Z",
  });
  return { plans, announced };
}

describe("planned meals: made, or not", () => {
  test("a meal starts as made; 'Didn't make it' is remembered and said", async () => {
    const { plans, announced } = setUp();
    await plans.writer.plan("2026-10-18", "dinner", "dal-tadka");
    expect((await plans.reader.all())[0]?.made).toBeUndefined();
    announced.length = 0;
    await plans.writer.notMade("2026-10-18", "dinner");
    expect((await plans.reader.all())[0]?.made).toBe("no");
    expect(announced).toEqual(["plans"]);
  });

  test("not made for a meal nobody planned changes nothing", async () => {
    const { plans, announced } = setUp();
    await plans.writer.notMade("2026-10-18", "lunch");
    expect(await plans.reader.all()).toEqual([]);
    expect(announced).toEqual([]);
  });

  test("a swap changes the dish and starts its prep over", async () => {
    const { plans } = setUp();
    await plans.writer.plan("2026-10-19", "dinner", "chole");
    await plans.writer.prep("2026-10-19", "dinner", "done", "21:00");
    await plans.writer.swap("2026-10-19", "dinner", "rajma");
    const [plan] = await plans.reader.all();
    expect(plan?.dish).toBe("rajma");
    expect(plan?.prep).toBeNull();
    expect(plan?.since).toBeUndefined();
  });

  test("a swap for a meal nobody planned plans it", async () => {
    const { plans } = setUp();
    await plans.writer.swap("2026-10-19", "lunch", "poha");
    expect((await plans.reader.all()).map((p) => [p.slot, p.dish])).toEqual([
      ["lunch", "poha"],
    ]);
  });
});
