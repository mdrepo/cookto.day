import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createPlans } from "../src/plans.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/145-child-dish.md: a meal's second dish, for the child, with an
// optional add-in, and taken away again.

function setUp() {
  return createPlans(memoryRecordStore(), {
    changes: createChanges(),
    now: () => "2026-10-18T08:00:00.000Z",
  });
}

describe("the child's dish", () => {
  test("a meal can have the child's dish beside its own", async () => {
    const plans = setUp();
    await plans.writer.plan("2026-10-18", "lunch", "dal-tadka");
    await plans.writer.plan("2026-10-18", "lunch", "veg-khichdi", "child");
    const all = await plans.reader.all();
    expect(all.map((p) => [p.slot, p.dish, p.for ?? "all"]).sort()).toEqual([
      ["lunch", "dal-tadka", "all"],
      ["lunch", "veg-khichdi", "child"],
    ]);
  });

  test("its add-in is chosen, and it can be taken away", async () => {
    const plans = setUp();
    await plans.writer.plan("2026-10-18", "lunch", "veg-khichdi", "child");
    await plans.writer.addIn("2026-10-18", "lunch", "egg");
    expect((await plans.reader.all())[0]?.addIn).toBe("egg");
    await plans.writer.remove("2026-10-18", "lunch", "child");
    expect(await plans.reader.all()).toEqual([]);
  });
});
