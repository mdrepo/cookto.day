import { describe, expect, test } from "bun:test";
import { createChanges, createPlans, memoryRecordStore } from "@cookto/data";
import {
  addChildDish,
  childAddIn,
  removeChildDish,
} from "../src/child-dish.js";

// specs/145-child-dish.md: "Add a dish for the child", "Remove", "Add egg".

describe("the child's dish", () => {
  test("added, given an add-in, and removed", async () => {
    const k = {
      plans: createPlans(memoryRecordStore(), { changes: createChanges() }),
    };
    await addChildDish(k, "2026-10-18", "lunch", "veg-khichdi");
    await childAddIn(k, "2026-10-18", "lunch", "egg");
    expect(await k.plans.reader.all()).toMatchObject([
      { slot: "lunch", dish: "veg-khichdi", for: "child", addIn: "egg" },
    ]);
    await removeChildDish(k, "2026-10-18", "lunch");
    expect(await k.plans.reader.all()).toEqual([]);
  });
});
