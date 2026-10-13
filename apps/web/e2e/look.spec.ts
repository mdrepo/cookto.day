import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/80-look.md, criteria 1 to 5: Today and the pantry, as the prototype
// draws them (criterion 6 is #72's own tests, still passing).

test.describe("Today and the pantry", () => {
  test("one pick per meal, and why", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.home();
    for (const meal of ["Lunch", "Dinner"]) {
      const pick = k.pick(meal);
      await expect(pick).toContainText("Palak paneer");
      await expect(pick).toContainText("with Roti or Rice");
      await expect(pick).toContainText("Uses Spinach and Paneer");
    }
    const ideas = await k.ideas("Lunch");
    expect(ideas).toHaveLength(5);
    for (const idea of ideas.slice(1)) expect(idea).toMatch(/Uses|Needs/);
  });

  test("food to use soon, at the top of Today", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Onion", { value: "1", unit: "kg" });
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    await expect(k.useSoon()).toHaveCount(1);
    await expect(k.useSoon().first()).toHaveAccessibleName(/^Spinach/);
    await expect(k.useSoon().first()).toContainText("Past its best");
  });

  test("a bar at the bottom between Today, the pantry and the dishes", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    const tab = (name: string) =>
      k.tabs().getByRole("button", { name, exact: true });
    await expect(tab("Today")).toHaveAttribute("aria-current", "page");
    await tab("Fridge").click();
    await expect(k.title()).toHaveText("Fridge");
    await expect(tab("Fridge")).toHaveAttribute("aria-current", "page");
    await expect(tab("Today")).not.toHaveAttribute("aria-current", "page");
    await tab("Dishes").click();
    await expect(k.title()).toHaveText("Dishes");
    await expect(tab("Dishes")).toHaveAttribute("aria-current", "page");
  });

  test("the pantry as a short list", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" }, 6);
    await expect(k.item("Spinach")).toHaveText(
      "Spinach250 g · use within 3 days",
    );
    await expect(k.item("Paneer")).toContainText("Use soon");
    for (const list of ["Use soon", "Fresh", "Staples"])
      await expect(page.getByRole("list", { name: list })).toBeVisible();
    const add = (await k.button("Add food").boundingBox())?.y ?? 0;
    const first = (await k.fresh().first().boundingBox())?.y ?? 0;
    expect(add).toBeLessThan(first);
  });

  test("tap a row to change it", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.open("Spinach");
    const sheet = k.sheet("Spinach");
    await expect(
      sheet.getByRole("combobox", { name: "How it is" }),
    ).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Change amount" }),
    ).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Used up" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(k.item("Spinach")).toBeFocused();

    await k.open("Spinach");
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
    await expect(k.item("Spinach")).toBeFocused();

    await k.mark("Spinach", "Past its best");
    await expect(k.item("Spinach")).toContainText("Past its best");
  });
});
