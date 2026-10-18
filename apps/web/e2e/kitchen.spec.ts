import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/72-kitchen.md, criteria 1 to 5 and 8 to 10 (6 and 7 are in
// cook-today.spec.ts, 11 in the pantry hook's test, 12 in tooling's tests).

test.describe("The kitchen", () => {
  test("choose what you cook", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Choose what you cook");
    await expect(k.title()).toHaveText("Choose what you cook");
    await expect(k.card("North Indian")).toContainText("28 dishes");
    for (const soon of ["South Indian", "European", "Sri Lankan"]) {
      await expect(k.card(soon)).toContainText("Coming soon");
      await expect(k.card(soon).getByRole("button")).toHaveCount(0);
    }
    await k.load("North Indian");
    await expect(k.card("North Indian")).toContainText("Loaded");
  });

  test("the usual staples, ticked for you", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Choose what you cook");
    await k.load("North Indian");
    await k.press("Add the usual staples");
    for (const group of ["Grains and dals", "Spices", "Basics"])
      await expect(k.card(group)).toBeVisible();
    const chips = page.getByRole("article").getByRole("button");
    await expect(chips).toHaveCount(25);
    for (const chip of await chips.all())
      await expect(chip).toHaveAttribute("aria-pressed", "true");
    await k.chip("Chickpeas").click();
    await k.chip("Rajma").click();
    await k.press("Add 23 staples");
    await expect(k.title()).toHaveText("Fridge");
    await expect(k.staples()).toHaveCount(23);
    await expect(k.staples().filter({ hasText: "Basmati rice" })).toContainText(
      "Have it",
    );
    await expect(k.staples().filter({ hasText: "Chickpeas" })).toHaveCount(0);
    await expect(k.staples().filter({ hasText: "Rajma" })).toHaveCount(0);
  });

  test("add fresh food, with its amount", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await expect(k.item("Spinach")).toContainText("250 g · use within 3 days");
    await k.add("Dragon fruit", { value: "2", unit: "pieces" });
    await expect(k.item("Dragon fruit")).toContainText("2 pieces");
    await expect(k.item("Dragon fruit")).not.toContainText("use within");
  });

  test("say how it is", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Onion", { value: "1", unit: "kg" });
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" }, 6);
    await expect(k.fresh().first()).toHaveAccessibleName(/^Paneer/);
    await k.mark("Spinach", "Past its best");
    await expect(k.fresh().first()).toHaveAccessibleName(/^Spinach/);
    await expect(k.item("Spinach")).toContainText("Past its best");
    await page.reload();
    await expect(k.fresh().first()).toHaveAccessibleName(/^Spinach/);
    await expect(k.item("Spinach")).toContainText("Past its best");
  });

  test("change an amount, or use it up", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.add("Onion", { value: "1", unit: "kg" });
    await k.changeAmount("Paneer", "100");
    await expect(k.item("Paneer")).toContainText("100 g");
    await k.usedUp("Onion");
    await expect(k.item("Onion")).toHaveCount(0);
  });

  test("what the household doesn't make", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.home();
    await k.press("Choose what you cook");
    await k.chip("Roti").click();
    await expect(k.chip("Roti")).toHaveAttribute("aria-pressed", "true");
    await k.home();
    for (const meal of ["Lunch", "Dinner"]) {
      const ideas = await k.ideas(meal);
      expect(ideas.length).toBeGreaterThan(1);
      for (const idea of ideas) expect(idea).not.toContain("Roti");
    }
    expect(
      (await k.ideas("Lunch")).find((i) => i.includes("Palak paneer")),
    ).toContain("with Rice");
  });

  test("a sample kitchen to try, and clearing it", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await expect(
      page.getByText("Sample kitchen", { exact: true }),
    ).toBeVisible();
    await expect(k.pick("Dinner")).toBeVisible();
    await k.press("Fridge");
    await expect(k.fresh().first()).toBeVisible();
    await k.home();
    await k.press("Choose what you cook");
    await expect(k.card("North Indian")).toContainText("Loaded");
    await k.home();

    await k.press("Clear the sample");
    await expect(page.getByText("Sample kitchen", { exact: true })).toHaveCount(
      0,
    );
    await expect(k.button("Try a sample kitchen")).toBeVisible();
    await k.press("Choose what you cook");
    await expect(
      k.card("North Indian").getByRole("button", { name: "Load" }),
    ).toBeVisible();
  });

  test("?sample opens with a sample kitchen", async ({ page }) => {
    const k = new Cooking(page);
    await k.start("/?sample");
    await expect(
      page.getByText("Sample kitchen", { exact: true }),
    ).toBeVisible();
    await expect(k.pick("Lunch")).toBeVisible();
    await expect(
      k.tabs().getByRole("button", { name: "Today" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("a cuisine's dishes", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k.press("Dishes");
    await expect(k.title()).toHaveText("Dishes");
    await expect(k.dishes()).toHaveCount(28);
    await expect(k.dishes().filter({ hasText: "Palak paneer" })).toContainText(
      "Lunch and Dinner",
    );
    for (const row of await k.dishes().all())
      await expect(row).toContainText(/Has everything|Needs \d+ things?/);
  });
});
