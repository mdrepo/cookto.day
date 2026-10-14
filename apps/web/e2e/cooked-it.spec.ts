import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/104-cooked-it.md: "We cooked this", and Today doesn't repeat it.

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-15T10:00:00");
const onDay = (page: Page, n: number) =>
  page.clock.setFixedTime(new Date(start.getTime() + n * DAY));

test.describe("We cooked this", () => {
  test("say it, in one tap", async ({ page }) => {
    await onDay(page, 0);
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const lunch = k.pick("Lunch");
    await lunch.getByRole("button", { name: "We cooked this" }).click();
    await expect(lunch).toContainText("Cooked today");
    await expect(
      lunch.getByRole("button", { name: "We cooked this" }),
    ).toHaveCount(0);

    await k.openDish("Aloo gobi");
    await k.press("We cooked this");
    await expect(page.getByRole("main")).toContainText("Cooked today");
    await expect(k.button("We cooked this")).toHaveCount(0);
  });

  test("the next days are different", async ({ page }) => {
    await onDay(page, 0);
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const cooked = await k.pickedDish("Lunch");
    await k
      .pick("Lunch")
      .getByRole("button", { name: "We cooked this" })
      .click();
    await expect(k.pick("Lunch")).toContainText("Cooked today");
    for (const day of [1, 2]) {
      await onDay(page, day);
      await page.reload();
      await expect(k.pick("Lunch")).toBeVisible();
      for (const meal of ["Lunch", "Dinner"])
        expect(await k.pickedDish(meal), `day ${day}`).not.toBe(cooked);
    }
    await onDay(page, 3);
    await page.reload();
    await expect(k.pick("Lunch")).toBeVisible();
    expect(await k.pickedDish("Lunch")).toBe(cooked);
  });

  test("it's remembered", async ({ page }) => {
    await onDay(page, 0);
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    await k
      .pick("Lunch")
      .getByRole("button", { name: "We cooked this" })
      .click();
    await expect(k.pick("Lunch")).toContainText("Cooked today");
    await page.reload();
    await expect(k.pick("Lunch")).toContainText("Cooked today");
  });
});
