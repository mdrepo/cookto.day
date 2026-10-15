import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/115-first-visit.md: empty pages say what to do next.

const steps = (page: Page) =>
  page.getByRole("list", { name: "Set up your kitchen" }).getByRole("listitem");

/** A page from the bar at the bottom; Today's title is the app's name. */
async function openTab(k: Cooking, name: string) {
  await k.tabs().getByRole("button", { name, exact: true }).click();
  await expect(k.title()).toHaveText(name === "Today" ? "cookto.day" : name);
}

test.describe("Empty pages", () => {
  test("an empty Fridge shows the next step", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await openTab(k, "Fridge");
    await expect(page.getByRole("main")).toContainText("Nothing here yet");
    await expect(steps(page)).toHaveText([
      /Choose what you cook/,
      /Add the usual staples/,
      /Add what you bought/,
    ]);
    // Only the first step can be pressed; the others wait their turn.
    await expect(steps(page).getByRole("button")).toHaveText([
      "Choose what you cook",
    ]);

    await k.press("Choose what you cook");
    await k.load("North Indian");
    await openTab(k, "Fridge");
    await expect(steps(page).first()).toContainText("Done");
    await expect(steps(page).getByRole("button")).toHaveText([
      "Add the usual staples",
    ]);

    await k.press("Add the usual staples");
    await page.getByRole("button", { name: /^Add \d+ staples$/ }).click();
    await expect(k.title()).toHaveText("Fridge");
    await expect(k.staples().first()).toBeVisible();
    await expect(steps(page).getByRole("button")).toHaveText([
      "Add what you bought",
    ]);
    await k.press("Add what you bought");
    await expect(page.getByRole("form", { name: "Add food" })).toBeVisible();
  });

  test("empty Dishes", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await openTab(k, "Dishes");
    await expect(page.getByRole("main")).toContainText("No dishes yet");
    await page
      .getByRole("main")
      .getByRole("button", { name: "Choose what you cook" })
      .click();
    await expect(k.title()).toHaveText("Choose what you cook");
  });

  test("Today's words are true", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await expect(page.getByRole("main")).toContainText(
      "Choose what you cook, then add what's in your kitchen.",
    );
    await expect(page.getByRole("main")).not.toContainText(/bill/i);
  });

  test("staples, but no fresh food", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await openTab(k, "Today");
    await expect(page.getByRole("main")).toContainText("No fresh food yet");
    await k.press("Add what you bought");
    await expect(k.title()).toHaveText("Fridge");
    await expect(page.getByRole("form", { name: "Add food" })).toBeVisible();
  });
});
