import { expect, type Page, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/175-more.md: My dishes, picked from packs; the plan comes from them.

async function myDishes(k: Cooking): Promise<void> {
  await k
    .tabs()
    .getByRole("button", { name: "My dishes", exact: true })
    .click();
  await expect(k.title()).toHaveText("My dishes");
}

const names = async (page: Page) =>
  (
    await page
      .getByRole("list", { name: /^(You can cook now|Need a few things)$/ })
      .getByRole("listitem")
      .allTextContents()
  ).map(
    (t) => /^(.*?)(Lunch|Breakfast|Morning|Evening|Dinner)/.exec(t)?.[1] ?? t,
  );

test.describe("My dishes", () => {
  test("the plan comes from My dishes", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    // Rajma waits for its soak with dried beans (specs/144).
    await k.settings();
    await page.getByRole("radio", { name: "Tinned beans" }).click();
    await myDishes(k);
    for (const dish of await names(page))
      if (dish !== "Dal tadka" && dish !== "Rajma") await k.takeOut(dish);
    await expect(k.dishes()).toHaveCount(2);
    await k.home();
    for (const meal of ["Lunch", "Dinner"]) {
      expect(["Dal tadka", "Rajma"]).toContain(await k.pickedDish(meal));
      for (const idea of await k.ideas(meal))
        expect(idea).toMatch(/^(Dal tadka|Rajma)/);
    }
  });

  test("the child's dishes", async ({ page }) => {
    const k = new Cooking(page);
    await page.goto("/");
    await k.press("Next");
    await k.press("Toddler");
    await k.press("Next");
    await k.press("Next");
    await k.press("Go to my kitchen");
    await k.loadNorthIndianWithStaples();
    await k.home();
    await k.press("Choose what you cook");
    await k.load("Our kitchen");
    await myDishes(k);
    const child = page.getByRole("list", { name: "For the child" });
    for (const dish of ["Khichdi with veggies", "Banana"])
      await expect(child.getByText(dish, { exact: true })).toBeVisible();
  });

  test("nothing changes on the day it ships", async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem("cookto.day:onboarded") !== null) return;
      localStorage.setItem("cookto.day:onboarded", "yes");
      localStorage.setItem(
        "cookto.day:kitchen",
        JSON.stringify({ cuisines: ["north-indian"], skip: [], sample: null }),
      );
    });
    await page.goto("/");
    const k = new Cooking(page);
    await myDishes(k);
    for (const dish of ["Palak paneer", "Dal tadka", "Poha", "Bhel puri"])
      await expect(
        k.dishes().filter({ hasText: new RegExp(`^${dish}`) }),
      ).toHaveCount(1);
    expect(await k.dishes().count()).toBeGreaterThanOrEqual(30);
  });
});
