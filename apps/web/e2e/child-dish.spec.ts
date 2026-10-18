import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/145-child-dish.md: some days the child eats a dish of their own.

/** Two adults and a toddler, North Indian and Our kitchen loaded. */
async function family(page: Page): Promise<Cooking> {
  const k = new Cooking(page);
  await page.goto("/");
  await k.press("Next");
  await k.press("Adult");
  await k.press("Toddler");
  await k.press("Next");
  await k.press("Go to my kitchen");
  await k.loadNorthIndianWithStaples();
  await k.home();
  await k.press("Choose what you cook");
  await k.load("Our kitchen");
  await k.home();
  return k;
}

/** The child's dish under a meal's pick. */
const childDish = (k: Cooking, meal: string) =>
  k.pick(meal).getByRole("list", { name: "For the child" });

async function khichdiForLunch(page: Page, k: Cooking): Promise<void> {
  await k
    .pick("Lunch")
    .getByRole("button", { name: "Add a dish for the child" })
    .click();
  await page
    .getByRole("dialog", { name: "Add a dish for the child" })
    .getByRole("button", { name: /^Khichdi with veggies/ })
    .click();
}

test.describe("A dish for the child", () => {
  test("a child's own dish", async ({ page }) => {
    const k = await family(page);
    const lunch = await k.pickedDish("Lunch");
    await khichdiForLunch(page, k);
    await expect(childDish(k, "Lunch")).toContainText(
      "For the child: Khichdi with veggies",
    );
    await k.pick("Lunch").getByRole("button", { name: lunch }).click();
    await expect(page.getByRole("main")).toContainText("For 2 people");
  });

  test("sharing again", async ({ page }) => {
    const k = await family(page);
    const lunch = await k.pickedDish("Lunch");
    await khichdiForLunch(page, k);
    await childDish(k, "Lunch").getByRole("button", { name: "Remove" }).click();
    await expect(childDish(k, "Lunch")).toHaveCount(0);
    await k.pick("Lunch").getByRole("button", { name: lunch }).click();
    await expect(page.getByRole("main")).toContainText("For 3 people");
  });

  test("an add-in", async ({ page }) => {
    const k = await family(page);
    await khichdiForLunch(page, k);
    await childDish(k, "Lunch")
      .getByRole("button", { name: /^Add eggs?$/ })
      .click();
    await expect(childDish(k, "Lunch")).toContainText(
      /Khichdi with veggies, with eggs?/,
    );
    await childDish(k, "Lunch")
      .getByRole("button", { name: /Khichdi with veggies/ })
      .click();
    await expect(page.getByRole("main")).toContainText("For 1 person");
    await expect(k.ingredient("Eggs")).toBeVisible();
  });

  test("snacks", async ({ page }) => {
    const k = await family(page);
    const snack = await k.pickedDish("Evening snack");
    expect([
      "Orange",
      "Banana",
      "Blueberries",
      "Cinnamon rolls",
      "Bread and butter",
    ]).toContain(snack);
    const ideas = await k.ideas("Evening snack");
    expect(ideas.find((i) => i.includes("Blueberries"))).toContain(
      "Cut in half",
    );
  });
});
