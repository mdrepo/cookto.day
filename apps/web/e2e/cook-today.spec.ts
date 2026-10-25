import { expect, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/72-kitchen.md, criteria 6 and 7: what to cook today, food that needs
// using first (ADR 0027).

test.describe("Cook today", () => {
  test("what to cook today, for each meal someone eats", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples(["Chickpeas"]);
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.home();
    const [top] = await k.ideas("Lunch");
    expect(top).toContain("Palak paneer");
    expect(top).toContain("Uses Spinach and Paneer");
    expect(top).toContain("Needs:");
    // #94: dinner gets a different dish, and still has suggestions.
    expect(await k.pickedDish("Dinner")).not.toBe("Palak paneer");
    await expect(k.pick("Breakfast")).toHaveCount(0);
  });

  test("food that needs using comes first", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Potato", { value: "1", unit: "kg" });
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    const texts = await k.ideas("Lunch");
    expect(texts[0]).toContain("Spinach");
    const spinach = texts.findIndex((t) => t.includes("Spinach"));
    const potatoOnly = texts.findIndex(
      (t) => t.includes("Potato") && !t.includes("Spinach"),
    );
    expect(potatoOnly).toBeGreaterThan(spinach);
  });
});
