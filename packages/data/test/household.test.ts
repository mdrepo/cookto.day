import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createHousehold, MEMBERS } from "../src/household.js";
import { memoryRecordStore } from "../src/record-store.js";
import { created } from "../src/records.js";

// specs/61-saving-data.md, criterion 3: the household remembers its people.

function setUp() {
  const store = memoryRecordStore();
  const changes = createChanges();
  const announced: string[] = [];
  changes.subscribe((topic) => {
    announced.push(topic);
  });
  let minute = 0;
  const now = () =>
    `2026-10-13T08:${String(minute++).padStart(2, "0")}:00.000Z`;
  const household = createHousehold(store, { changes, now });
  return { store, household, announced };
}

describe("the household remembers its people", () => {
  test("people are listed in the order added, with their default meals", async () => {
    const { household } = setUp();
    await household.writer.addMember("adult");
    await household.writer.addMember("child", "Kid");
    const people = await household.reader.members();
    expect(people.map((p) => [p.kind, p.nickname, p.meals])).toEqual([
      ["adult", undefined, ["lunch", "dinner"]],
      [
        "child",
        "Kid",
        ["breakfast", "morning-snack", "lunch", "evening-snack", "dinner"],
      ],
    ]);
  });

  test("changing a person's meals saves them, one version up", async () => {
    const { store, household } = setUp();
    const adult = await household.writer.addMember("adult");
    await household.writer.setMeals(adult.id, ["breakfast", "dinner"]);
    const [person] = await household.reader.members();
    expect(person?.meals).toEqual(["breakfast", "dinner"]);
    const stored = await store.get<{ version: number }>(MEMBERS, adult.id);
    expect(stored?.version).toBe(2);
  });

  test("removing a person leaves them out, but keeps their record", async () => {
    const { store, household } = setUp();
    const adult = await household.writer.addMember("adult");
    await household.writer.removeMember(adult.id);
    expect(await household.reader.members()).toEqual([]);
    const stored = await store.get<{ deletedAt: string | null }>(
      MEMBERS,
      adult.id,
    );
    expect(stored?.deletedAt).not.toBeNull();
  });

  test("a stored person the engine finds wrong is left out", async () => {
    const { store, household } = setUp();
    await household.writer.addMember("adult");
    await store.put(MEMBERS, [
      created({ kind: "adult", meals: ["brunch"] }, "2026-10-13T07:00:00.000Z"),
    ]);
    const people = await household.reader.members();
    expect(people.map((p) => p.kind)).toEqual(["adult"]);
    expect(people[0]?.meals).toEqual(["lunch", "dinner"]);
  });

  test("each change announces that the household changed", async () => {
    const { household, announced } = setUp();
    const adult = await household.writer.addMember("adult");
    await household.writer.setMeals(adult.id, ["dinner"]);
    await household.writer.removeMember(adult.id);
    expect(announced).toEqual(["household", "household", "household"]);
  });
});
