import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/95-dish-page.md: a dish's page, with what you have, what you need,
// amounts for everyone at home, and a link to the recipe.

test.describe("A dish's page", () => {
  test("open a dish from Dishes", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Palak paneer");
    await expect(page.getByRole("main")).toContainText("Lunch and Dinner");
    await k.press("Back");
    await expect(k.title()).toHaveText("My dishes");
  });

  test("open a dish from Today", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const lunch = await k.pickedDish("Lunch");
    await k.pick("Lunch").getByRole("button", { name: lunch }).click();
    await expect(k.title()).toHaveText(lunch);
    await page.goBack();
    await k.pick("Lunch").getByRole("button", { name: "Other ideas" }).click();
    const idea = k
      .pick("Lunch")
      .getByRole("list", { name: "Other ideas" })
      .getByRole("button")
      .first();
    const name = (await idea.locator("strong").textContent()) ?? "";
    await idea.click();
    await expect(k.title()).toHaveText(name);
  });

  test("what you have, and what you need", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.openDish("Palak paneer");
    await expect(k.dishList("You need")).toContainText("Cream");
    await expect(k.dishList("You need")).not.toContainText("Spinach");
    for (const food of ["Spinach", "Paneer", "Cumin"])
      await expect(k.dishList("You have")).toContainText(food);

    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    for (const food of ["Potato", "Green chilli", "Coriander leaves"])
      await k.add(food);
    await k.openDish("Aloo paratha");
    // The reviewed recipe (#149) takes ginger.
    await expect(k.dishList("You need")).toContainText("Ginger");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.add("Ginger");
    await k.openDish("Aloo paratha");
    await expect(page.getByRole("main")).toContainText("Has everything");
    await expect(k.dishList("You need")).toHaveCount(0);
  });

  test("amounts for everyone at home", async ({ page }) => {
    const k = new Cooking(page);
    await page.goto("/");
    await k.press("Next");
    await k.press("Adult");
    await k.press("Next");
    await k.press("Go to my kitchen");
    await k.loadNorthIndianWithStaples();
    await k.openDish("Palak paneer");
    await expect(page.getByRole("main")).toContainText("For 2 people");
    await expect(k.ingredient("Spinach")).toContainText("150 g");
    await expect(k.ingredient("Cumin")).toContainText("0.6 g");
  });

  test("what to serve it with", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    await k.press("Choose what you cook");
    await k.chip("Roti").click();
    await k.home();
    await k.openDish("Palak paneer");
    await expect(page.getByRole("main")).toContainText("Serve with Rice");
    await expect(page.getByRole("main")).not.toContainText("Roti");
  });

  test("the recipe, from its source", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Palak paneer");
    const link = page.getByRole("link", { name: /See a full version/ });
    await expect(link).toHaveAttribute(
      "href",
      "https://www.vegrecipesofindia.com/palak-paneer/",
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toContainText("vegrecipesofindia.com");
  });
});
