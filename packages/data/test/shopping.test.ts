import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { memoryRecordStore } from "../src/record-store.js";
import { createShopping } from "../src/shopping.js";

// specs/103-shopping-list.md: the list remembers what to buy, each once.

function setUp() {
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const list = createShopping(memoryRecordStore(), {
    changes,
    now: () => "2026-10-15T08:00:00.000Z",
  });
  return { list, announced };
}

describe("the shopping list", () => {
  test("adds each thing once, says how many it added, and says so", async () => {
    const { list, announced } = setUp();
    expect(await list.writer.add(["cream", "onion", "tomato"])).toBe(3);
    expect(await list.writer.add(["onion", "potato", "potato"])).toBe(1);
    expect((await list.reader.items()).map((i) => i.ingredient)).toEqual([
      "cream",
      "onion",
      "tomato",
      "potato",
    ]);
    expect(announced).toContain("shopping");
  });

  test("a removed thing leaves the list", async () => {
    const { list } = setUp();
    await list.writer.add(["cream", "onion"]);
    const [cream] = await list.reader.items();
    await list.writer.remove(cream?.id ?? "");
    expect((await list.reader.items()).map((i) => i.ingredient)).toEqual([
      "onion",
    ]);
  });
});
