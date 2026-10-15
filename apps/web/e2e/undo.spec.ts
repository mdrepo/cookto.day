import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/116-undo.md: a one-tap change has a one-tap way back.

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-16T10:00:00");
const onDay = (page: Page, n: number) =>
  page.clock.setFixedTime(new Date(start.getTime() + n * DAY));

/** The note a change leaves, with its Undo. */
const note = (page: Page) => page.getByRole("status");

/** A kitchen with onions, 1 kg, bought yesterday, and tomatoes. */
async function withOnions(k: Cooking) {
  await k.start();
  await k.loadNorthIndianWithStaples();
  await k.add("Onion", { value: "1", unit: "kg" }, 1);
  await k.add("Tomato");
}

test.describe("Undo", () => {
  test("undo used up", async ({ page }) => {
    const k = new Cooking(page);
    await withOnions(k);
    const before = await k.item("Onion").textContent();
    await k.usedUp("Onion");
    await expect(k.item("Onion")).toHaveCount(0);
    await expect(note(page)).toContainText("Onion used up");
    await note(page).getByRole("button", { name: "Undo" }).click();
    await expect(k.item("Onion")).toHaveText(before ?? "");
    await expect(note(page)).toHaveCount(0);
  });

  test("the note goes when they move on", async ({ page }) => {
    const k = new Cooking(page);
    await withOnions(k);
    await k.usedUp("Onion");
    await expect(note(page)).toContainText("Onion used up");
    // It doesn't go by itself: people need time to read it.
    await page.waitForTimeout(4000);
    await expect(note(page)).toContainText("Onion used up");
    await k.open("Tomato");
    await expect(note(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(k.item("Onion")).toHaveCount(0);

    await k.usedUp("Tomato");
    await expect(note(page)).toContainText("Tomato used up");
    await k.home();
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await expect(k.title()).toHaveText("Fridge");
    await expect(note(page)).toHaveCount(0);
    await expect(k.item("Tomato")).toHaveCount(0);
  });

  test("undo we cooked this", async ({ page }) => {
    await onDay(page, 0);
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const dish = await k.pickedDish("Lunch");
    const lunch = k.pick("Lunch");
    await lunch.getByRole("button", { name: "We cooked this" }).click();
    await expect(lunch).toContainText("Cooked today");
    await lunch.getByRole("button", { name: "Undo" }).click();
    await expect(
      lunch.getByRole("button", { name: "We cooked this" }),
    ).toBeVisible();
    await expect(lunch).not.toContainText("Cooked today");
    await onDay(page, 1);
    await page.reload();
    expect(await k.pickedDish("Lunch")).toBe(dish);
  });
});
