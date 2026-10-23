import { expect, test } from "@playwright/test";
import { at } from "./support/cook.js";
import { household, householdServer } from "./support/household.js";
import {
  cookJoins,
  daysOff,
  mayur,
  mealTimes,
  priya,
  settingsOf,
} from "./support/schedule.js";

// specs/240-meal-times-and-days-off.md, criteria 1 to 5: the household's
// settings as one synced record, the time zone from the phone that starts
// the household, meal times, the cook's days off, and one planner. One
// server in the test, the API faked in each page (ADR 0025).

test.describe("Meal times and days off", () => {
  test("the settings record syncs", async ({ page, browser }) => {
    test.slow();
    const s = householdServer();
    const m = await mayur(page, s);
    await page.getByRole("radio", { name: /Tinned beans/ }).check();
    await mealTimes(page).getByLabel("Lunch").selectOption("13:30");
    await m.k.home();
    await m.k.press("Looks good");
    await expect(page.getByText("Tomorrow's sorted")).toBeVisible();
    await expect
      .poll(() => settingsOf(s), { timeout: 10_000 })
      .toMatchObject({
        beans: "tinned",
        sorted: "2026-10-20",
        mealTimes: { lunch: "13:30" },
      });
    // Only Singapore can be chosen yet (specs/65): the country travels in
    // the same record.
    expect(settingsOf(s)?.country).toBe("SG");

    const second = await browser.newContext();
    const other = await second.newPage();
    const p = await priya(other, s);
    await expect(
      other.getByRole("radio", { name: /Tinned beans/ }),
    ).toBeChecked({ timeout: 10_000 });
    await expect(mealTimes(other).getByLabel("Lunch")).toHaveValue("13:30");
    await p.k.home();
    await expect(other.getByText("Tomorrow's sorted")).toBeVisible();
    await second.close();
  });

  test.describe("in Asia/Kolkata", () => {
    test.use({ timezoneId: "Asia/Kolkata" });
    test("the time zone is the phone's", async ({ page }) => {
      const s = householdServer();
      await mayur(page, s);
      await expect(
        household(page).getByText("Time zone: Asia/Kolkata"),
      ).toBeVisible();
      await expect
        .poll(() => settingsOf(s)?.timeZone, { timeout: 10_000 })
        .toBe("Asia/Kolkata");
    });
  });

  test("meal times", async ({ page }) => {
    const s = householdServer();
    await mayur(page, s);
    const times = mealTimes(page);
    await expect(times.getByLabel("Lunch")).toHaveValue("13:00");
    await expect(times.getByLabel("Dinner")).toHaveValue("20:00");
    await expect(times.getByLabel("Breakfast")).toHaveCount(0);
    await expect(times.getByLabel("Morning snack")).toHaveCount(0);
    await expect(times.getByLabel("Evening snack")).toHaveCount(0);

    await times.getByLabel("Dinner").selectOption("12:30");
    await expect(times.getByText("Dinner must be after lunch.")).toBeVisible();
    await expect(times.getByLabel("Dinner")).toHaveValue("20:00");

    await times.getByLabel("Dinner").selectOption("21:00");
    await expect(times.getByText("Dinner must be after lunch.")).toHaveCount(0);
    await expect(times.getByLabel("Dinner")).toHaveValue("21:00");
    await expect
      .poll(() => settingsOf(s)?.mealTimes?.dinner, { timeout: 10_000 })
      .toBe("21:00");
  });

  test("days off", async ({ page }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    cookJoins(s);
    await m.k.home();
    await m.k.settings();
    await expect(
      household(page).getByText("The cook, on Telegram"),
    ).toBeVisible();
    await daysOff(page)
      .getByRole("button", { name: "Sunday", exact: true })
      .click();
    await daysOff(page).getByLabel("Add a date").selectOption("2026-10-25");
    await expect(
      household(page).getByText("Off Sundays and 25 Oct"),
    ).toBeVisible();
    await expect
      .poll(() => settingsOf(s)?.daysOff, { timeout: 10_000 })
      .toEqual({ weekdays: [0], dates: ["2026-10-25"] });

    await at(page, "2026-10-26T19:00");
    await page.reload();
    await expect(household(page).getByText("Off Sundays")).toBeVisible();
    await expect(household(page).getByText("25 Oct")).toHaveCount(0);
  });

  test("one planner", async ({ page }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    await household(page).getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Who?")).toBeVisible();
    await expect(m.k.button("The cook")).toBeVisible();
    await expect(m.k.button("Someone who plans")).toHaveCount(0);
  });
});
