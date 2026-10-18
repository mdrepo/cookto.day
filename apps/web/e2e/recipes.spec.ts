import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/149-recipes.md: every dish reviewed, with amounts for the household
// and short steps in our own words.

test.describe("Recipes", () => {
  test("amounts for the household", async ({ page }) => {
    const k = new Cooking(page);
    await page.goto("/");
    await k.press("Next");
    await k.press("Adult");
    await k.press("Adult");
    await k.press("Next");
    await k.press("Go to my kitchen");
    await k.loadNorthIndianWithStaples();
    await k.openDish("Egg curry");
    await expect(page.getByRole("main")).toContainText("For 3 people");
    await expect(k.ingredient("Eggs")).toContainText("6 pieces");
  });
});
