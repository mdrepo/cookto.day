import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/96-theme.md: choose light, dark, or the phone's theme, in Settings.

/** The page's background: the theme people see. */
const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
/** Night paper, warm since #80's polish. */
const DARK = "rgb(33, 25, 19)";
const LIGHT = "rgb(251, 247, 240)";

async function openSettings(k: Cooking) {
  await k.settings();
}

/** One of the theme's choices, as a radio button. */
const theme = (page: Page, name: string) =>
  page.getByRole("group", { name: "Theme" }).getByRole("radio", { name });

test.describe("The theme", () => {
  test("choose a theme in Settings", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    const k = new Cooking(page);
    await k.start();
    await openSettings(k);
    await expect(theme(page, "Same as phone")).toBeChecked();
    await expect(
      page.getByRole("group", { name: "Theme" }).getByRole("radio"),
    ).toHaveCount(3);
    await expect(theme(page, "Light")).not.toBeChecked();
    expect(await background(page)).toBe(LIGHT);
    await theme(page, "Dark").check();
    expect(await background(page)).toBe(DARK);
    await k.press("Back");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await expect(k.title()).toHaveText("Fridge");
    expect(await background(page)).toBe(DARK);
  });

  test("it's remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    const k = new Cooking(page);
    await k.start();
    await openSettings(k);
    await theme(page, "Dark").check();
    await page.reload();
    await expect(k.title()).toHaveText("Settings");
    await expect(theme(page, "Dark")).toBeChecked();
    expect(await background(page)).toBe(DARK);
  });

  test("same as phone", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const k = new Cooking(page);
    await k.start();
    await openSettings(k);
    await theme(page, "Light").check();
    expect(await background(page)).toBe(LIGHT);
    await theme(page, "Same as phone").check();
    expect(await background(page)).toBe(DARK);
  });
});
