import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";
import { Kitchen } from "./support/kitchen.js";

// #84, criteria 4 to 6: Today and the pantry with the prototype's layout.

test.describe("The prototype's layout", () => {
  test("the language isn't on every page: it's in Settings, behind a gear on Today", async ({
    page,
  }) => {
    const k = new Cooking(page);
    const kitchen = new Kitchen(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await expect(kitchen.languageField()).toHaveCount(0);
    for (const tab of ["Fridge", "Dishes"]) {
      await k.tabs().getByRole("button", { name: tab, exact: true }).click();
      await expect(k.title()).toHaveText(tab);
      await expect(kitchen.languageField(), tab).toHaveCount(0);
    }
    await k.settings();
    await expect(kitchen.languageField()).toHaveValue("en");
    await k.press("Back");
    await expect(k.title()).toHaveText("cookto.day");
  });

  test("setup's first step has the language; the next one doesn't", async ({
    page,
  }) => {
    const kitchen = new Kitchen(page);
    const k = new Cooking(page);
    await page.goto("/");
    await expect(k.title()).toHaveText("Where do you live?");
    await expect(kitchen.languageField()).toHaveValue("en");
    await k.press("Next");
    await expect(k.title()).toHaveText("Who eats at home?");
    await expect(kitchen.languageField()).toHaveCount(0);
  });

  test("Today: the date above the title, and the sample in one warm card with its buttons", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    const date = await page.evaluate(() =>
      new Date().toLocaleDateString("en", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
    await expect(
      page.locator("header h1").locator("xpath=preceding-sibling::p"),
    ).toHaveText(date);
    const card = page.getByRole("region", { name: "Sample kitchen" });
    await expect(
      card.getByRole("button", { name: "Choose what you cook" }),
    ).toBeVisible();
    await expect(
      card.getByRole("button", { name: "Clear the sample" }),
    ).toBeVisible();
  });

  test("Today's warm card shows the logo, the pot", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    const empty = page.getByRole("region", { name: "Your kitchen is empty" });
    const logo = empty.locator("img");
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await k.press("Try a sample kitchen");
    await expect(
      page.getByRole("region", { name: "Sample kitchen" }).locator("img"),
    ).toBeVisible();
  });

  test("the pantry: Add food at the title's end, and small section titles", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await expect(
      page.getByRole("banner").getByRole("button", { name: "Add food" }),
    ).toBeVisible();
    const fresh = page.getByRole("heading", { level: 2, name: "Fresh" });
    expect(await fresh.evaluate((el) => getComputedStyle(el).fontSize)).toBe(
      "14px",
    );
  });
});
