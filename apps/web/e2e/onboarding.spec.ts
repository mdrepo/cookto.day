import { expect, test } from "@playwright/test";
import { Onboarding } from "./support/onboarding.js";

// specs/65-onboarding.md, criteria 1 and 3 to 8 (2 is in languages.spec.ts,
// 9 in the hook's test, 10 in the kit's).

const ALL = ["Breakfast", "Morning snack", "Lunch", "Evening snack", "Dinner"];

test.describe("Onboarding", () => {
  test("a first visit starts with where you live", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await expect(start.title()).toHaveText("Where do you live?");
    await expect(start.step()).toHaveText("Step 1 of 2");
    await expect(start.country("Singapore")).toBeChecked();
    await expect(start.countryCard("Singapore")).toContainText(
      "S$ · RedMart · GrabMart · foodpanda mart · Cold Storage · Sheng Siong",
    );
    for (const name of ["India", "United Arab Emirates"]) {
      await expect(start.country(name)).toBeDisabled();
      await expect(start.country(name)).toHaveAccessibleDescription(
        "Coming soon",
      );
    }
  });

  test("everyone who eats at home, with their meals", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await expect(start.title()).toHaveText("Who eats at home?");
    await expect(start.step()).toHaveText("Step 2 of 2");

    // One adult, eating lunch and dinner.
    await expect(start.people()).toHaveCount(1);
    for (const meal of ALL)
      await expect(start.meal("Adult", meal)).toHaveAttribute(
        "aria-pressed",
        String(meal === "Lunch" || meal === "Dinner"),
      );

    // A child eats all five; a toddler is marked toddler food.
    await start.add("Child");
    for (const meal of ALL)
      await expect(start.meal("Child", meal)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    await start.add("Toddler");
    await expect(start.person("Toddler")).toContainText("toddler food");

    // Tapping a meal ticks it, and again unticks it. Adding the toddler
    // folded the adult's card to one line (#114): open it first.
    await expect(start.person("Adult")).toContainText("Lunch, Dinner");
    await start.openCard("Adult");
    await start.meal("Adult", "Breakfast").click();
    await expect(start.meal("Adult", "Breakfast")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await start.meal("Adult", "Breakfast").click();
    await expect(start.meal("Adult", "Breakfast")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Without a name, two children are numbered; a name replaces it.
    await start.add("Child");
    await expect(start.person("Child 1")).toBeVisible();
    await expect(start.person("Child 2")).toBeVisible();
    await start.name("Child 1", "Kid");
    await expect(start.person("Kid")).toBeVisible();

    // Removing everyone: they're asked to add someone, and can't go on.
    for (const name of ["Adult", "Child 2", "Kid", "Toddler"])
      await start.remove(name);
    await expect(start.people()).toHaveCount(0);
    await expect(page.getByText("Add at least one person.")).toBeVisible();
    await expect(start.button("Next")).toBeDisabled();
  });

  test("all set, before going on", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await start.add("Child");
    await start.next();
    await expect(start.title()).toHaveText("All set");
    await expect(
      page.getByText("We'll plan 5 meals a day for 2 people."),
    ).toBeVisible();
    await expect(start.plannedFor("Breakfast")).toContainText("Child");
    await expect(start.plannedFor("Lunch")).toContainText("Everyone");

    // Back returns to who eats, as they left it.
    await start.button("Back").click();
    await expect(start.title()).toHaveText("Who eats at home?");
    await expect(start.people()).toHaveCount(2);
    await start.meal("Child", "Evening snack").click();
    await start.next();
    await expect(start.plannedFor("Evening snack")).toContainText(
      "Not planned",
    );
  });

  test("home shows the household, and Edit opens who eats", async ({
    page,
  }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await start.add("Child");
    await start.next();
    await start.button("Go to my kitchen").click();

    await expect(start.household()).toHaveText("2 people · 5 meals a day");
    await expect(start.emptyKitchen()).toContainText("Your kitchen is empty");
    const line = await start.household().boundingBox();
    const kitchen = await start.emptyKitchen().boundingBox();
    expect(line && kitchen && line.y < kitchen.y).toBe(true);

    await start.button("Edit").click();
    await expect(start.title()).toHaveText("Who eats at home?");
    await expect(start.person("Child")).toBeVisible();
  });

  test("skip for now", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await start.button("Skip for now").click();
    await expect(start.household()).toHaveText("1 person · 2 meals a day");
  });

  test("asked once", async ({ page }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await start.add("Toddler");
    await start.next();
    await start.button("Go to my kitchen").click();
    await expect(start.household()).toHaveText("2 people · 5 meals a day");

    await page.reload();
    await expect(start.household()).toHaveText("2 people · 5 meals a day");
    await start.open();
    await expect(start.household()).toHaveText("2 people · 5 meals a day");
    await expect(start.title()).toHaveText("cookto.day");
  });

  test("the browser's back button goes to the step before", async ({
    page,
  }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    await start.add("Child");
    await start.next();
    await expect(start.title()).toHaveText("All set");

    await page.goBack();
    await expect(start.title()).toHaveText("Who eats at home?");
    await expect(start.people()).toHaveCount(2);
    await page.goBack();
    await expect(start.title()).toHaveText("Where do you live?");
    await expect(start.country("Singapore")).toBeChecked();
  });
});
