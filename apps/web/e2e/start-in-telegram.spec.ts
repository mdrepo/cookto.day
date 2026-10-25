import { expect, type Page, test } from "./support/test.js";
import { fakeHouseholdApi, householdServer } from "./support/household.js";
import { Onboarding } from "./support/onboarding.js";
import {
  fakeTelegramProof,
  fromTelegram,
  telegramWindow,
} from "./support/telegram.js";

// specs/260-start-in-telegram.md, criteria 5, 6 and 8: "Set up your
// kitchen" opens the app inside Telegram for someone with no household. The
// page signs in with Telegram's proof, asks the app's own setup questions,
// and "Go to my kitchen" starts the household. Criterion 7 (a household
// already: Today) is specs/241's "Tomorrow, opened from Telegram". The API
// faked in the page (ADR 0025).

/** The setup page, opened inside Telegram by Asha, who has no household. */
async function openedByAsha(page: Page) {
  const s = householdServer();
  await fakeHouseholdApi(page, s);
  await fakeTelegramProof(page, s, "Asha");
  await page.goto(fromTelegram("good"));
  return { s, start: new Onboarding(page) };
}

/** The people the household was started with: each one's meals. */
const startedWith = (s: ReturnType<typeof householdServer>) =>
  (s.created[0]?.records ?? [])
    .filter((r) => r.collection === "members")
    .map((r) => r.record.meals);

test.describe("Start in Telegram", () => {
  test("setup inside Telegram", async ({ page }) => {
    const { s, start } = await openedByAsha(page);
    await expect(start.title()).toHaveText("Where do you live?", {
      timeout: 10_000,
    });
    await start.next();
    await start.add("Adult");
    await start.next();
    await expect(page.getByRole("radio", { name: "I cook" })).toBeChecked();
    await start.next();
    await start.button("Go to my kitchen").click();
    await expect(start.household()).toHaveText("2 people · 2 meals a day", {
      timeout: 10_000,
    });
    expect(s.created).toHaveLength(1);
    expect(startedWith(s)).toEqual([
      ["lunch", "dinner"],
      ["lunch", "dinner"],
    ]);
  });

  test("invite the cook from setup", async ({ page }) => {
    const posted = await telegramWindow(page);
    const { s, start } = await openedByAsha(page);
    await expect(start.title()).toHaveText("Where do you live?", {
      timeout: 10_000,
    });
    await start.next();
    await start.next();
    await page.getByRole("radio", { name: "Someone else cooks" }).click();
    await start.next();
    await start.button("Go to my kitchen").click();

    const code = page.getByRole("status", { name: "Household" });
    await expect(code).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
      timeout: 10_000,
    });
    expect(s.created).toHaveLength(1);
    const link = `https://t.me/cookto_day_bot?start=${((await code.textContent()) ?? "").replace("-", "")}`;
    await start.button("Send the link").click();
    expect(await posted()).toEqual([
      {
        eventType: "web_app_open_tg_link",
        eventData: {
          path_full: `/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Get the day's meals from me here:")}`,
        },
      },
    ]);
  });

  test("skip for now", async ({ page }) => {
    const { s, start } = await openedByAsha(page);
    await expect(start.title()).toHaveText("Where do you live?", {
      timeout: 10_000,
    });
    await start.next();
    await start.button("Skip for now").click();
    await expect(start.household()).toHaveText("1 person · 2 meals a day", {
      timeout: 10_000,
    });
    expect(startedWith(s)).toEqual([["lunch", "dinner"]]);
  });
});
