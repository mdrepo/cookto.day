import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/144-prep.md: tomorrow is planned tonight, and each planned meal's
// prep is marked done ("Soaking since 9 pm"), or "No" in the morning.

function setUp() {
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const plans = createPlans(memoryRecordStore(), {
    changes,
    now: () => "2026-10-18T13:00:00.000Z",
  });
  return { plans, announced };
}

const brief = (p: {
  on: string;
  slot: string;
  dish: string;
  prep: unknown;
}) => [p.on, p.slot, p.dish, p.prep];

describe("planned meals", () => {
  test("a meal is planned once: the first plan for a day and slot stays", async () => {
    const { plans, announced } = setUp();
    await plans.writer.plan("2026-10-19", "lunch", "chole");
    await plans.writer.plan("2026-10-19", "lunch", "dal-tadka");
    await plans.writer.plan("2026-10-19", "dinner", "rajma");
    expect((await plans.reader.all()).map(brief).sort()).toEqual([
      ["2026-10-19", "dinner", "rajma", null],
      ["2026-10-19", "lunch", "chole", null],
    ]);
    expect(announced).toContain("plans");
  });

  test("its prep is marked done, with when, or not done", async () => {
    const { plans } = setUp();
    await plans.writer.plan("2026-10-19", "lunch", "chole");
    await plans.writer.plan("2026-10-19", "dinner", "rajma");
    await plans.writer.prep("2026-10-19", "lunch", "done", "21:00");
    await plans.writer.prep("2026-10-19", "dinner", "skipped");
    const all = await plans.reader.all();
    expect(all.find((p) => p.slot === "lunch")).toMatchObject({
      prep: "done",
      since: "21:00",
    });
    expect(all.find((p) => p.slot === "dinner")?.prep).toBe("skipped");
  });
});
