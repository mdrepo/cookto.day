import { describe, expect, test } from "bun:test";
import { createChanges } from "../src/changes.js";
import { createHousehold } from "../src/household.js";
import { memoryRecordStore } from "../src/record-store.js";

// specs/65-onboarding.md, criterion 3: a name is optional, and can change.

describe("a person's name", () => {
  test("can be given, changed and cleared", async () => {
    const changes = createChanges();
    const announced: string[] = [];
    changes.subscribe((topic) => {
      announced.push(topic);
    });
    const { reader, writer } = createHousehold(memoryRecordStore(), {
      changes,
    });
    const kid = await writer.addMember("child");
    await writer.setNickname(kid.id, "Kid");
    expect((await reader.members())[0]?.nickname).toBe("Kid");
    await writer.setNickname(kid.id, undefined);
    const [person] = await reader.members();
    expect(person).toEqual({ id: kid.id, kind: "child", meals: kid.meals });
    expect(announced).toHaveLength(3);
  });
});
