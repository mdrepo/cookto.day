import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/105-fridge-to-dish.md: from a food to the dishes that use it.

test.describe("From the fridge to a dish", () => {
  test("from a food's sheet", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.open("Spinach");
    await k
      .sheet("Spinach")
      .getByRole("button", { name: "Dishes with Spinach" })
      .click();
    await expect(k.title()).toHaveText("With Spinach");
    const rows = await k.dishes().allTextContents();
    expect(rows).toHaveLength(2);
    expect(rows.join(" ")).toContain("Palak paneer");
    expect(rows.join(" ")).toContain("Aloo palak");
    await k.press("All dishes");
    await expect(k.title()).toHaveText("Dishes");
    await expect(k.dishes()).toHaveCount(30);
  });

  test("from Today's Use soon", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    await k.useSoon().filter({ hasText: "Spinach" }).click();
    await expect(k.sheet("Spinach")).toBeVisible();
    await expect(k.title()).toHaveText("cookto.day");
    await expect(
      k.sheet("Spinach").getByRole("button", { name: "Dishes with Spinach" }),
    ).toBeVisible();
  });

  test("food no dish uses", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Dragon fruit", { value: "2", unit: "pieces" });
    await k.open("Spinach");
    await expect(
      k.sheet("Spinach").getByRole("button", { name: /^Dishes with/ }),
    ).toHaveCount(1);
    await page.keyboard.press("Escape");
    await k.open("Dragon fruit");
    await expect(
      k.sheet("Dragon fruit").getByRole("button", { name: /^Dishes with/ }),
    ).toHaveCount(0);
  });
});
