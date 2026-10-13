import { describe, expect, test } from "bun:test";
import {
  createChanges,
  createHousehold,
  createSettings,
  memoryKeyValue,
  memoryRecordStore,
} from "@cookto/data";
import {
  addPerson,
  finishOnboarding,
  removePerson,
  renamePerson,
  skipOnboarding,
  startHousehold,
  toggleMeal,
} from "../src/household.js";

// specs/65-onboarding.md, criteria 3, 6 and 7: who eats which meals, and
// onboarding asked once. The repositories run on memory (ADR 0024).

function setUp() {
  const household = createHousehold(memoryRecordStore(), {
    changes: createChanges(),
  });
  const { store, writer: settings } = createSettings(memoryKeyValue(), {
    languages: ["en"],
    fallback: "en",
    countries: ["SG"],
    fallbackCountry: "SG",
  });
  const people = () => household.reader.members();
  return {
    deps: { household, settings },
    people,
    onboarded: () => store.getState().onboarded,
  };
}

describe("who eats which meals", () => {
  test("it starts with one adult eating lunch and dinner, only once", async () => {
    const { deps, people } = setUp();
    await startHousehold(deps);
    await startHousehold(deps);
    expect((await people()).map((p) => [p.kind, p.meals])).toEqual([
      ["adult", ["lunch", "dinner"]],
    ]);
  });

  test("a new person's meals follow who they are; a blank name is no name", async () => {
    const { deps, people } = setUp();
    await addPerson(deps, "toddler", "  ");
    await addPerson(deps, "child", " Kid ");
    const [toddler, child] = await people();
    expect(toddler?.meals).toHaveLength(5);
    expect(toddler?.nickname).toBeUndefined();
    expect(child?.nickname).toBe("Kid");
  });

  test("ticking a meal adds it in the day's order; ticking again takes it off", async () => {
    const { deps, people } = setUp();
    const adult = await addPerson(deps, "adult");
    await toggleMeal(deps, adult.id, "breakfast");
    expect((await people())[0]?.meals).toEqual([
      "breakfast",
      "lunch",
      "dinner",
    ]);
    await toggleMeal(deps, adult.id, "lunch");
    expect((await people())[0]?.meals).toEqual(["breakfast", "dinner"]);
  });

  test("a name can change, and be cleared", async () => {
    const { deps, people } = setUp();
    const child = await addPerson(deps, "child");
    await renamePerson(deps, child.id, " Kid ");
    expect((await people())[0]?.nickname).toBe("Kid");
    await renamePerson(deps, child.id, "");
    expect((await people())[0]?.nickname).toBeUndefined();
  });

  test("a person can be removed", async () => {
    const { deps, people } = setUp();
    const adult = await addPerson(deps, "adult");
    await removePerson(deps, adult.id);
    expect(await people()).toEqual([]);
  });
});

describe("onboarding is asked once", () => {
  test("it can't finish with nobody in the household", async () => {
    const { deps, onboarded } = setUp();
    expect(await finishOnboarding(deps)).toBe(false);
    expect(onboarded()).toBe(false);
  });

  test("with someone in it, it finishes", async () => {
    const { deps, onboarded } = setUp();
    await addPerson(deps, "adult");
    expect(await finishOnboarding(deps)).toBe(true);
    expect(onboarded()).toBe(true);
  });

  test("skipping finishes with one adult eating lunch and dinner", async () => {
    const { deps, people, onboarded } = setUp();
    await skipOnboarding(deps);
    expect((await people()).map((p) => [p.kind, p.meals])).toEqual([
      ["adult", ["lunch", "dinner"]],
    ]);
    expect(onboarded()).toBe(true);
  });

  test("skipping keeps the people already added", async () => {
    const { deps, people } = setUp();
    await addPerson(deps, "child");
    await skipOnboarding(deps);
    expect((await people()).map((p) => p.kind)).toEqual(["child"]);
  });
});
