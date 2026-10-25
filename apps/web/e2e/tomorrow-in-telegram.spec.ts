import { expect, test } from "./support/test.js";
import {
  cookConnected,
  evening,
  fakeApi,
  swapDinner,
  tomorrow,
} from "./support/cook.js";
import {
  fakeHouseholdApi,
  householdServer,
  tomorrowDinner,
} from "./support/household.js";
import { mayur } from "./support/schedule.js";
import {
  fakeTelegramProof,
  fromTelegram,
  RECIPES,
} from "./support/telegram.js";

// specs/241-tomorrow-in-telegram.md, criteria 9 to 11: the cook's recipes
// page, Tomorrow's card now that the bot asks at 10 pm, and Tomorrow opened
// inside Telegram by "Change". The API faked in each page (ADR 0025).

test.describe("Tomorrow in Telegram", () => {
  test("the recipes page", async ({ page }) => {
    await page.goto(RECIPES);
    const breakfast = page.getByRole("article", { name: "Breakfast" });
    await expect(breakfast).toContainText("Poha");
    await expect(breakfast).toContainText("For 3 people");
    await expect(
      breakfast.getByRole("listitem").filter({ hasText: "Poha" }),
    ).toContainText("180 g");
    await expect(breakfast.getByRole("img")).toHaveCount(1);
    await expect(
      breakfast.getByRole("link", { name: "Recipe" }),
    ).toHaveAttribute(
      "href",
      "https://www.indianhealthyrecipes.com/poha-recipe/",
    );

    const lunch = page.getByRole("article", { name: "Lunch" });
    await expect(lunch).toContainText("Dal tadka");
    await expect(lunch).toContainText("For 2 people");
    await expect(
      lunch.getByRole("listitem").filter({ hasText: "Toor dal" }),
    ).toContainText("100 g");
    await expect(lunch.getByRole("link", { name: "Recipe" })).toHaveAttribute(
      "href",
      "https://www.indianhealthyrecipes.com/dal-tadka/",
    );
    // No kitchen, no sign-in: nothing asks for either.
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue with Telegram" }),
    ).toHaveCount(0);
  });

  test("tomorrow's card", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    const k = await evening(page);
    const tm = tomorrow(page);
    await expect(tm).toContainText("We'll ask you at 10 pm.");
    await expect(tm).not.toContainText("Goes to the cook at 9 pm");
    // Nothing waits on the server for 9 pm any more.
    await swapDinner(k, page);
    await expect(tm).toContainText("We'll ask you at 10 pm.");
    expect(api.sends.filter((s) => s.at !== undefined)).toEqual([]);
    // "Looks good" in the app still sends at once.
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Sent to the cook, 7:00 pm");
    expect(api.sends).toHaveLength(1);
  });

  test("Tomorrow, opened from Telegram", async ({ page, browser }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    await m.k.home();
    const dish = await swapDinner(m.k, page);
    await expect
      .poll(
        () =>
          s
            .recordsOf("plans")
            .some((r) => r.slot === "dinner" && r.version === 2),
        { timeout: 10_000 },
      )
      .toBe(true);

    // Telegram's own window: no storage shared with the phone's app.
    const window = await browser.newContext();
    const inside = await window.newPage();
    await fakeHouseholdApi(inside, s);
    await fakeTelegramProof(inside, s, "Mayur");
    await inside.clock.setFixedTime(new Date("2026-10-19T22:05:00"));
    await inside.goto(fromTelegram("good"));
    await expect(tomorrowDinner(inside)).toContainText(dish, {
      timeout: 10_000,
    });
    await window.close();

    const forged = await browser.newContext();
    const other = await forged.newPage();
    await fakeHouseholdApi(other, s);
    await fakeTelegramProof(other, s, "Mayur");
    await other.goto(fromTelegram("forged"));
    await expect(other.getByText("Open this from the app.")).toBeVisible();
    await expect(other.getByRole("region", { name: "Tomorrow" })).toHaveCount(
      0,
    );
    await expect(other.getByRole("button", { name: "Next" })).toHaveCount(0);
    await forged.close();
  });
});
