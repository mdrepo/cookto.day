import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createCooked } from "../src/cooked.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/104-cooked-it.md: what the household cooked, and when, so Today
// keeps the next days different.

function setUp() {
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  const cooked = createCooked(memoryRecordStore(), {
    changes,
    now: () => "2026-10-15T08:00:00.000Z",
  });
  return { cooked, announced };
}

describe("what was cooked", () => {
  test("remembers each dish and the day, once a day, and says so", async () => {
    const { cooked, announced } = setUp();
    await cooked.writer.add("palak-paneer", "2026-10-15");
    await cooked.writer.add("palak-paneer", "2026-10-15");
    await cooked.writer.add("chole", "2026-10-14");
    expect(
      (await cooked.reader.all()).map((c) => [c.dish, c.on]).sort(),
    ).toEqual([
      ["chole", "2026-10-14"],
      ["palak-paneer", "2026-10-15"],
    ]);
    expect(announced).toContain("cooked");
  });

  test("a dish marked by mistake can be taken back, for that day only (#116)", async () => {
    const { cooked } = setUp();
    await cooked.writer.add("palak-paneer", "2026-10-15");
    await cooked.writer.add("palak-paneer", "2026-10-14");
    await cooked.writer.remove("palak-paneer", "2026-10-15");
    expect((await cooked.reader.all()).map((c) => [c.dish, c.on])).toEqual([
      ["palak-paneer", "2026-10-14"],
    ]);
  });
});
