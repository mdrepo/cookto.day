import { describe, expect, test } from "bun:test";
import { createPacks } from "../src/packs.js";

// specs/72-kitchen.md, criterion 1: the cuisines, and loading one's dishes.

describe("the cuisine packs", () => {
  test("North Indian, Maharashtrian and Our kitchen are open with their dishes; the others are coming soon", () => {
    const cuisines = createPacks().cuisines();
    expect(cuisines.map((c) => [c.id, c.soon])).toEqual([
      ["north-indian", false],
      ["maharashtrian", false],
      ["our-kitchen", false],
      ["south-indian", true],
      ["european", true],
      ["sri-lankan", true],
    ]);
    // Poha and bhel puri moved to Maharashtrian (specs/147).
    expect(cuisines[0]?.dishes).toBe(28);
  });

  test("loads an open pack's dishes, keyed by Wikidata ids", async () => {
    const pack = await createPacks().load("north-indian");
    const palak = pack.dishes.find((d) => d.id === "palak-paneer");
    expect(palak?.ingredients).toContain("Q36814998");
    expect(pack.words.en?.dishes["palak-paneer"]).toBe("Palak paneer");
  });

  test("a pack's steps load on their own: each dish has six to eight (#149)", async () => {
    const steps = await createPacks().steps("north-indian");
    const pack = await createPacks().load("north-indian");
    for (const dish of pack.dishes) {
      expect(steps[dish.id]?.length).toBeGreaterThanOrEqual(6);
      expect(steps[dish.id]?.length).toBeLessThanOrEqual(8);
    }
  });

  test("a pack that's coming soon, or unknown, can't be loaded", () => {
    const packs = createPacks();
    expect(packs.load("south-indian")).rejects.toThrow(
      'No pack "south-indian" to load yet.',
    );
    expect(packs.load("nope")).rejects.toThrow('No pack "nope" to load yet.');
  });
});
