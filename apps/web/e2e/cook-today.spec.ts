import { expect, test } from "@playwright/test";
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
    for (const meal of ["Lunch", "Dinner"]) {
      const top = k.suggestions(meal).first();
      await expect(top).toContainText("Palak paneer");
      await expect(top).toContainText("Uses Spinach and Paneer");
    }
    await expect(k.suggestions("Breakfast")).toHaveCount(0);
    await expect(
      k.suggestions("Lunch").filter({ hasText: "Palak paneer" }),
    ).toContainText("Needs:");
  });

  test("food that needs using comes first", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Potato", { value: "1", unit: "kg" });
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    const rows = k.suggestions("Lunch");
    await expect(rows.first()).toContainText("Spinach");
    const texts = await rows.allTextContents();
    const spinach = texts.findIndex((t) => t.includes("Spinach"));
    const potatoOnly = texts.findIndex(
      (t) => t.includes("Potato") && !t.includes("Spinach"),
    );
    expect(potatoOnly).toBeGreaterThan(spinach);
  });
});
