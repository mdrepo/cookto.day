import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/113-quick-add.md: tap the fresh food you bought.

/** North Indian loaded, nothing in the fridge, on the Fridge. */
async function emptyFridge(k: Cooking) {
  await k.start();
  await k.press("Choose what you cook");
  await k.load("North Indian");
  await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
  await expect(k.title()).toHaveText("Fridge");
}

/** "Tap what you bought", in the Fridge's "Add food". */
const tapped = (page: Page) =>
  page.getByRole("group", { name: "Tap what you bought" });

const food = (page: Page, name: string) =>
  tapped(page).getByRole("button", { name, exact: true });

const addButton = (page: Page) =>
  page
    .getByRole("form", { name: "Add food" })
    .getByRole("button", { name: /^Add/ });

test.describe("Quick add", () => {
  test("tap what you bought", async ({ page }) => {
    const k = new Cooking(page);
    await emptyFridge(k);
    await k.press("Add food");
    const names = await tapped(page).getByRole("button").allTextContents();
    expect(names.length).toBeGreaterThan(10);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await expect(food(page, "Spinach")).toBeVisible();
    // Staples are added with "Add the usual staples", not here.
    await expect(food(page, "Basmati rice")).toHaveCount(0);
    for (const name of ["Spinach", "Tomato", "Coriander leaves"])
      await food(page, name).click();
    await expect(food(page, "Spinach")).toHaveAttribute("aria-pressed", "true");
    await expect(addButton(page)).toHaveText("Add 3");
    await addButton(page).click();
    await expect(k.item("Spinach")).toContainText(/use within 3 days/i);
    await expect(k.item("Tomato")).toContainText(/use within 10 days/i);
    await expect(k.item("Coriander leaves")).toContainText(
      /use within 14 days/i,
    );
  });

  test("bought another day", async ({ page }) => {
    const k = new Cooking(page);
    await emptyFridge(k);
    await k.press("Add food");
    await food(page, "Spinach").click();
    await page
      .getByRole("form", { name: "Add food" })
      .getByRole("combobox", { name: "Bought" })
      .selectOption({ label: "Yesterday" });
    await expect(addButton(page)).toHaveText("Add 1");
    await addButton(page).click();
    await expect(k.item("Spinach")).toContainText(/use within 2 days/i);
  });

  test("tap and type together", async ({ page }) => {
    const k = new Cooking(page);
    await emptyFridge(k);
    await k.press("Add food");
    await food(page, "Tomato").click();
    await page
      .getByRole("form", { name: "Add food" })
      .getByRole("textbox", { name: "Name" })
      .fill("Mango");
    await expect(addButton(page)).toHaveText("Add 2");
    await addButton(page).click();
    await expect(k.item("Tomato")).toBeVisible();
    await expect(k.item("Mango")).toBeVisible();
  });

  test("bought, so off the list", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    for (const name of [
      "Spinach",
      "Paneer",
      "Green chilli",
      "Garlic",
      "Ginger",
    ])
      await k.add(name);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Shopping list (3)" }),
    ).toBeVisible();
    await k.press("Add food");
    await food(page, "Tomato").click();
    await addButton(page).click();
    await expect(k.item("Tomato")).toBeVisible();
    await page.getByRole("button", { name: "Shopping list (2)" }).click();
    await expect(
      page.getByRole("list", { name: "Shopping list" }).getByRole("listitem"),
    ).toHaveText(["Onion", "Cream"]);
  });
});
