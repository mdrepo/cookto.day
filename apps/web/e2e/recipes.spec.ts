import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/149-recipes.md: every dish reviewed, with amounts for the household
// and short steps in our own words.

test.describe("Recipes", () => {
  test("steps on the dish page", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Dal tadka");
    const steps = page.getByRole("list", { name: "Steps" });
    await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
    await expect(steps.getByRole("listitem").first()).toContainText("toor dal");
    expect(await steps.getByRole("listitem").count()).toBeGreaterThanOrEqual(6);
    const full = page.getByRole("link", { name: /See a full version/ });
    await expect(full).toHaveAttribute("target", "_blank");
    // Under the ingredients, and the link at the end, after the steps.
    const top = async (l: typeof full) => (await l.boundingBox())?.y ?? 0;
    expect(await top(steps)).toBeGreaterThan(await top(k.dishList("You have")));
    expect(await top(full)).toBeGreaterThan(await top(steps));
  });

  test("steps you can cook from", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Dal tadka");
    const steps = page.getByRole("list", { name: "Steps" });
    // The heat, how long, and how to tell it's done.
    await expect(steps).toContainText("on medium");
    await expect(steps).toContainText("whistles");
    await expect(steps).toContainText(/until/);
  });

  test("amounts for the household", async ({ page }) => {
    const k = new Cooking(page);
    await page.goto("/");
    await k.press("Next");
    await k.press("Adult");
    await k.press("Adult");
    await k.press("Next");
    await k.press("Next");
    await k.press("Go to my kitchen");
    await k.loadNorthIndianWithStaples();
    await k.openDish("Egg curry");
    await expect(page.getByRole("main")).toContainText("For 3 people");
    await expect(k.ingredient("Eggs")).toContainText("6 pieces");
  });
});
