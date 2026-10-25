import { expect, type Page, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";
import { fakeHouseholdApi, householdServer } from "./support/household.js";
import { Onboarding } from "./support/onboarding.js";
import { fakeTelegramProof, fromTelegram } from "./support/telegram.js";

// specs/263-what-you-cook.md: setup asks what the household cooks, between
// who eats and who cooks, and a tick loads that cuisine, so a household
// that finishes setup has its own dishes.

/** Setup, on "What do you cook?", with one adult eating lunch and dinner. */
async function whatYouCook(page: Page) {
  const start = new Onboarding(page);
  await start.open();
  await start.next();
  await start.next();
  return start;
}

test.describe("What you cook", () => {
  test("what do you cook", async ({ page }) => {
    const start = await whatYouCook(page);
    await expect(start.title()).toHaveText("What do you cook?");
    await expect(start.step()).toHaveText("Step 3 of 4");
    for (const name of ["North Indian", "Maharashtrian", "Our kitchen"]) {
      await expect(start.cuisine(name)).toHaveText(
        new RegExp(`^${name} · \\d+ dishes$`),
      );
      await expect(start.cuisine(name)).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    for (const name of ["South Indian", "European", "Sri Lankan"]) {
      await expect(start.cuisine(name)).toHaveText(`${name} · Coming soon`);
      await expect(start.cuisine(name)).toBeDisabled();
    }
    await expect(page.getByText("Choose at least one.")).toBeVisible();
    await expect(start.button("Next")).toBeDisabled();
  });

  test("ticked cuisines are loaded", async ({ page }) => {
    const start = await whatYouCook(page);
    await start.tick("North Indian");
    await start.tick("Maharashtrian");
    await start.tick("Maharashtrian");
    await expect(start.cuisine("North Indian")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(start.cuisine("Maharashtrian")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await start.next();
    await expect(start.title()).toHaveText("Who cooks?");
    await expect(start.step()).toHaveText("Step 4 of 4");
    await start.next();
    await start.button("Go to my kitchen").click();

    const k = new Cooking(page);
    await expect(k.title()).toHaveText("cookto.day");
    await expect(page.getByText("Your kitchen is empty")).toHaveCount(0);
    await k.press("Choose what you cook");
    await expect(k.card("North Indian")).toContainText("Loaded");
    await expect(k.card("Maharashtrian")).not.toContainText("Loaded");
  });

  test("back keeps the ticks", async ({ page }) => {
    const start = await whatYouCook(page);
    await start.tick("North Indian");
    await start.next();
    await expect(start.title()).toHaveText("Who cooks?");
    await start.button("Back").click();
    await expect(start.title()).toHaveText("What do you cook?");
    await expect(start.cuisine("North Indian")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(start.button("Next")).toBeEnabled();
  });

  test("skip for now", async ({ page }) => {
    const start = await whatYouCook(page);
    await start.button("Skip for now").click();
    await expect(start.household()).toHaveText("1 person · 2 meals a day");
    await expect(start.emptyKitchen()).toContainText("Your kitchen is empty");
  });

  test("inside Telegram", async ({ page }) => {
    const s = householdServer();
    await fakeHouseholdApi(page, s);
    await fakeTelegramProof(page, s, "Asha");
    await page.goto(fromTelegram("good"));
    const start = new Onboarding(page);
    await expect(start.title()).toHaveText("Where do you live?", {
      timeout: 10_000,
    });
    await start.next();
    await start.next();
    await start.tick("North Indian");
    await start.next();
    await start.next();
    await start.button("Go to my kitchen").click();
    await expect(start.household()).toHaveText("1 person · 2 meals a day", {
      timeout: 10_000,
    });
    const settings = (s.created[0]?.records ?? []).find(
      (r) => r.collection === "household-settings",
    );
    expect(
      (settings?.record.kitchen as { cuisines: string[] } | undefined)
        ?.cuisines,
    ).toEqual(["north-indian"]);
  });
});
