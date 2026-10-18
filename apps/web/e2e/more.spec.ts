import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/175-more.md: a More tab with Packs and Settings.

test.describe("More", () => {
  test("More", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await expect(k.button("Settings")).toHaveCount(0);
    await k.tabs().getByRole("button", { name: "More", exact: true }).click();
    await expect(k.title()).toHaveText("More");
    for (const row of ["Packs", "Settings"])
      await expect(
        page.getByRole("main").getByRole("button", { name: row }),
      ).toBeVisible();
    await k.press("Packs");
    await expect(k.title()).toHaveText("Choose what you cook");
    await page.goBack();
    await k.press("Settings");
    await expect(k.title()).toHaveText("Settings");
  });
});
