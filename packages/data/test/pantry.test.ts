import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createPantry, PANTRY } from "../src/pantry.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/72-kitchen.md, criteria 3 to 5 and 9: the pantry remembers what's in
// the kitchen, how much, and how it is (ADR 0027).

function setUp() {
  const store = memoryRecordStore();
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const pantry = createPantry(store, {
    changes,
    now: () => "2026-10-13T08:00:00.000Z",
  });
  return { store, pantry, announced };
}

const spinach = {
  ingredient: "Q36814998",
  amount: 250,
  unit: "g" as const,
  boughtOn: "2026-10-13",
  shelfLifeDays: 3,
};
const onions = { ...spinach, ingredient: "Q3406628", amount: 1000 };

describe("the pantry", () => {
  test("lists what was added, in the order added, and says so", async () => {
    const { pantry, announced } = setUp();
    await pantry.writer.add([spinach, onions]);
    const items = await pantry.reader.items();
    expect(items.map((i) => [i.ingredient, i.amount])).toEqual([
      ["Q36814998", 250],
      ["Q3406628", 1000],
    ]);
    expect(announced).toEqual(["pantry"]);
  });

  test("changes an amount, or forgets it", async () => {
    const { pantry } = setUp();
    const [item] = await pantry.writer.add([spinach]);
    await pantry.writer.setAmount(item?.id ?? "", 100, "g");
    expect((await pantry.reader.items())[0]?.amount).toBe(100);
    await pantry.writer.setAmount(item?.id ?? "", undefined, undefined);
    expect((await pantry.reader.items())[0]).not.toHaveProperty("amount");
  });

  test("keeps the person's mark, and clears it", async () => {
    const { pantry } = setUp();
    const [item] = await pantry.writer.add([spinach]);
    await pantry.writer.mark(item?.id ?? "", "past-its-best");
    expect((await pantry.reader.items())[0]?.mark).toBe("past-its-best");
    await pantry.writer.mark(item?.id ?? "", undefined);
    expect((await pantry.reader.items())[0]).not.toHaveProperty("mark");
  });

  test("used up leaves the pantry, but keeps its record for sync", async () => {
    const { store, pantry } = setUp();
    const [item] = await pantry.writer.add([spinach]);
    await pantry.writer.useUp(item?.id ?? "");
    expect(await pantry.reader.items()).toEqual([]);
    const kept = await store.get<{ deletedAt: string | null }>(
      PANTRY,
      item?.id ?? "",
    );
    expect(kept?.deletedAt).not.toBeNull();
  });

  test("used up by mistake comes back as it was, one version on (#116)", async () => {
    const { store, pantry } = setUp();
    const [item] = await pantry.writer.add([spinach]);
    const id = item?.id ?? "";
    await pantry.writer.useUp(id);
    await pantry.writer.bringBack(id);
    expect(await pantry.reader.items()).toEqual([
      { ...spinach, id, sample: false },
    ]);
    const kept = await store.get<{ deletedAt: string | null; version: number }>(
      PANTRY,
      id,
    );
    expect(kept?.deletedAt).toBeNull();
    expect(kept?.version).toBe(3);
  });

  test("sample items are marked, and clearing the sample removes only them", async () => {
    const { pantry } = setUp();
    await pantry.writer.add([onions]);
    await pantry.writer.add([spinach], { sample: true });
    expect((await pantry.reader.items()).map((i) => i.sample)).toEqual([
      false,
      true,
    ]);
    await pantry.writer.removeSample();
    expect((await pantry.reader.items()).map((i) => i.ingredient)).toEqual([
      "Q3406628",
    ]);
  });
});
