import { expect, type Page, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";
import { storageFails, storageWorks } from "./support/storage.js";

// specs/138-save-errors.md: a failed save says so.

/** What a failed save says, heard at once. */
const problem = (page: Page) => page.getByRole("alert");

async function fridge(page: Page) {
  const k = new Cooking(page);
  await k.start();
  await k.loadNorthIndianWithStaples();
  return k;
}

test.describe("A failed save", () => {
  test("the phone is out of space", async ({ page }) => {
    const k = await fridge(page);
    await storageFails(page, "full");
    await k.tryAdd("Spinach");
    await expect(problem(page)).toContainText(
      "Couldn't save that. Your phone is out of space.",
    );
    await expect(k.item("Spinach")).toHaveCount(0);
  });

  test("any other failure", async ({ page }) => {
    const k = await fridge(page);
    await k.add("Onion");
    await storageFails(page, "broken");
    await k.usedUp("Onion");
    await expect(problem(page)).toContainText("Couldn't save that. Try again.");
    await expect(k.item("Onion")).toBeVisible();
  });

  test("it goes when they've read it", async ({ page }) => {
    const k = await fridge(page);
    await storageFails(page, "broken");
    await k.tryAdd("Spinach");
    await expect(problem(page)).toBeVisible();
    await problem(page).getByRole("button", { name: "OK" }).click();
    await expect(problem(page)).toHaveCount(0);

    // What they typed is still there, so they try again.
    await k.addAgain();
    await expect(problem(page)).toBeVisible();
    await storageWorks(page);
    await k.addAgain();
    await expect(k.item("Spinach")).toBeVisible();
    await expect(problem(page)).toHaveCount(0);
  });
});
