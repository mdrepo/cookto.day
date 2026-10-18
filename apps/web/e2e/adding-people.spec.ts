import { expect, type Locator, test } from "@playwright/test";
import { Onboarding } from "./support/onboarding.js";

// specs/114-adding-people.md: one card open at a time, add buttons in reach.

/** The step where people are added, with its first adult. */
async function whoEats(start: Onboarding) {
  await start.open();
  await start.next();
  await expect(start.step()).toHaveText("Step 2 of 3");
}

/** Whether the middle of `button` is the button itself, not something over it. */
const uncovered = (button: Locator) =>
  button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return top !== null && el.contains(top);
  });

test.describe("Adding people", () => {
  test("one card open at a time", async ({ page }) => {
    const start = new Onboarding(page);
    await whoEats(start);
    await start.add("Adult");
    await expect(start.nameBox("Adult 2")).toBeVisible();
    await expect(start.nameBox("Adult 1")).toHaveCount(0);
    await expect(start.person("Adult 1")).toContainText("Lunch, Dinner");
    await start
      .person("Adult 1")
      .getByRole("button", { expanded: false })
      .click();
    await expect(start.nameBox("Adult 1")).toBeVisible();
    await expect(start.nameBox("Adult 2")).toHaveCount(0);
  });

  test("the add buttons stay in reach", async ({ page }) => {
    const start = new Onboarding(page);
    await whoEats(start);
    await start.add("Child");
    await start.add("Toddler");
    await expect(start.person("Child")).toContainText(
      "Breakfast, Morning snack, Lunch, Evening snack, Dinner",
    );
    for (const kind of ["Adult", "Child", "Toddler"]) {
      const button = start.button(kind);
      await expect(button).toBeInViewport();
      expect(await uncovered(button)).toBe(true);
    }
  });

  test("done typing closes the keyboard", async ({ page }) => {
    const start = new Onboarding(page);
    await whoEats(start);
    await start.nameBox("Adult").fill("Asha");
    await start.nameBox("Asha").press("Enter");
    await expect(start.step()).toHaveText("Step 2 of 3");
    await expect(start.nameBox("Asha")).not.toBeFocused();
    await expect(start.nameBox("Asha")).toHaveValue("Asha");
  });
});
