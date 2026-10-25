import { expect, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/149-recipes.md, criterion 4: frozen food.

test.describe("Frozen food", () => {
  test("frozen food", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.press("Add food");
    const form = page.getByRole("form", { name: "Add food" });
    await form.getByRole("textbox", { name: "Name" }).fill("Green peas");
    await form
      .getByRole("combobox", { name: "Where" })
      .selectOption({ label: "Frozen" });
    await form.getByRole("button", { name: "Add" }).click();
    await expect(k.item("Green peas")).toContainText(/use within 3 months/i);
  });
});
