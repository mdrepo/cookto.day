import { expect, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/94-different-dishes.md: lunch and dinner suggest different dishes.

test.describe("Lunch and dinner", () => {
  test("each meal gets its own dish", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const lunch = await k.pickedDish("Lunch");
    expect(await k.pickedDish("Dinner")).not.toBe(lunch);
    // Lunch's dish can still be an idea for dinner, after the others.
    const others = (await k.ideas("Dinner")).slice(1);
    const at = others.findIndex((idea) => idea.startsWith(lunch));
    if (at !== -1) expect(at).toBe(others.length - 1);
  });

  test("food that needs using still comes first", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Onion", { value: "1", unit: "kg" });
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    const [lunch] = await k.ideas("Lunch");
    const [dinner] = await k.ideas("Dinner");
    expect(lunch).toContain("Spinach");
    expect(await k.pickedDish("Dinner")).not.toBe(await k.pickedDish("Lunch"));
    // North Indian has more than one dish with spinach.
    expect(dinner).toContain("Spinach");
  });
});
