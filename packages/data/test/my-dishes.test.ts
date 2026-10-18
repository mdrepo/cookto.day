import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createMyDishes } from "../src/my-dishes.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/175-more.md: My dishes is every dish of the packs a household has
// opened, but the ones it took out. Saved is what was taken out, as
// sync-ready records, so nothing changes on the day it ships.

function setUp() {
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const myDishes = createMyDishes(memoryRecordStore(), {
    changes,
    now: () => "2026-10-18T08:00:00.000Z",
  });
  return { myDishes, announced };
}

describe("My dishes", () => {
  test("starts with nothing taken out", async () => {
    const { myDishes } = setUp();
    expect(await myDishes.reader.takenOut()).toEqual([]);
  });

  test("remembers each dish taken out, once, and says so", async () => {
    const { myDishes, announced } = setUp();
    await myDishes.writer.takeOut("poha");
    await myDishes.writer.takeOut("poha");
    await myDishes.writer.takeOut("chole");
    expect((await myDishes.reader.takenOut()).sort()).toEqual([
      "chole",
      "poha",
    ]);
    expect(announced).toContain("my-dishes");
  });

  test("a dish added back is in My dishes again", async () => {
    const { myDishes } = setUp();
    await myDishes.writer.takeOut("poha");
    await myDishes.writer.takeOut("chole");
    await myDishes.writer.add("poha");
    await myDishes.writer.add("dal-tadka");
    expect(await myDishes.reader.takenOut()).toEqual(["chole"]);
  });
});
