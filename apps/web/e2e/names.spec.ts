import { expect, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/148-food-names.md: food by the names people use.

test.describe("Food names", () => {
  test("the household's own word", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach");
    await page.goto("/?preview-language=mr#/kitchen/pantry");
    await expect(
      page
        .getByRole("list", { name: /./ })
        .getByRole("button", { name: /^पालक/ }),
    ).toBeVisible();
  });

  test("typing the name a family uses", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.press("Add food");
    const form = page.getByRole("form", { name: "Add food" });
    await form.getByRole("textbox", { name: "Name" }).fill("palak");
    await form.getByRole("button", { name: "Add" }).click();
    await expect(k.item("Spinach")).toContainText(/use within 3 days/i);
  });
});
