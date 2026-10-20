import { expect, test } from "@playwright/test";
import { at } from "./support/cook.js";
import { Cooking } from "./support/cooking.js";
import { fakeSignInApi, signedIn } from "./support/sign-in.js";

// specs/216-sign-in-telegram.md: "Continue with Telegram" in Settings, a
// code, Start in the bot, signed in; sign out; signed out elsewhere. The
// API is faked in the browser (ADR 0025): the test is the server.

const BOT_LINK = "https://t.me/cookto_day_bot?start=KM7Q4HTX";

test.describe("Sign in with Telegram", () => {
  test("sign in", async ({ page }) => {
    const api = await fakeSignInApi(page);
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await k.press("Continue with Telegram");
    await expect(
      page.getByText("We keep your Telegram name and id, and your kitchen"),
    ).toBeVisible();
    await k.press("Continue");
    await expect(page.getByRole("status", { name: "Account" })).toHaveText(
      "KM7Q-4HTX",
    );
    const open = page.getByRole("link", { name: "Open Telegram" });
    await expect(open).toHaveAttribute("href", BOT_LINK);
    await expect(page.getByText("Waiting for Telegram")).toBeVisible();
    api.started = true;
    await expect(page.getByText("Signed in as Mayur")).toBeVisible({
      timeout: 10_000,
    });
    await expect(k.button("Sign out")).toBeVisible();
    await expect(page.getByText("KM7Q-4HTX")).toHaveCount(0);
    // The kitchen on the phone is as it was.
    await k.home();
    await expect(
      page.getByRole("region", { name: "Your kitchen is empty" }),
    ).toBeVisible();
  });

  test("the code runs out", async ({ page }) => {
    await fakeSignInApi(page);
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await k.press("Continue with Telegram");
    await k.press("Continue");
    await expect(page.getByText("KM7Q-4HTX")).toBeVisible();
    await at(page, "2026-10-19T19:11");
    await expect(page.getByText("That code ran out")).toBeVisible({
      timeout: 10_000,
    });
    await k.press("Try again");
    await expect(page.getByRole("status", { name: "Account" })).toHaveText(
      "PR8W-5JTY",
    );
  });

  test("sign out", async ({ page }) => {
    await signedIn(page);
    const api = await fakeSignInApi(page);
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await expect(page.getByText("Signed in as Mayur")).toBeVisible();
    await k.press("Sign out");
    await expect(k.button("Continue with Telegram")).toBeVisible();
    expect(api.asked).toContain("signOut");
    await expect(page.getByText("Signed in as")).toHaveCount(0);
    await k.home();
    await expect(
      page.getByRole("region", { name: "Your kitchen is empty" }),
    ).toBeVisible();
  });

  test("signed out elsewhere", async ({ page }) => {
    await signedIn(page);
    const api = await fakeSignInApi(page);
    api.session = false;
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await expect(page.getByText("You're signed out")).toBeVisible();
    await expect(k.button("Continue with Telegram")).toBeVisible();
    await expect(page.getByText("Signed in as")).toHaveCount(0);
    await k.home();
    await expect(
      page.getByRole("region", { name: "Your kitchen is empty" }),
    ).toBeVisible();
  });
});
