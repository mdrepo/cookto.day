import { expect, test } from "@playwright/test";
import {
  at,
  cookConnected,
  evening,
  fakeApi,
  fakeShare,
  NINE_PM,
  planner,
  shared,
  swapDinner,
  tomorrow,
} from "./support/cook.js";
import { Cooking } from "./support/cooking.js";

// specs/207-connect-the-cook.md: connect the cook's Telegram from Settings,
// and tomorrow's plan reaches her by itself. The API is faked in the
// browser (ADR 0025): the test is the server. The fakes live in support/cook.

test.describe("Connect the cook", () => {
  test("connect the cook", async ({ page }) => {
    await fakeShare(page);
    await planner(page);
    const api = await fakeApi(page);
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await k.press("Connect the cook's Telegram");
    await expect(page.getByText("kept for 90 days")).toBeVisible();
    await k.press("Connect");
    await expect(
      page.getByRole("status", { name: "The cook's Telegram" }),
    ).toHaveText("KM7Q-4HTX");
    await expect(k.button("Send the link")).toBeVisible();
    await expect(page.getByText("Waiting for the cook")).toBeVisible();
    await k.press("Send the link");
    expect(await shared(page)).toEqual([
      "https://t.me/cookto_day_bot?start=KM7Q4HTX",
    ]);
    api.connected = true;
    await expect(page.getByText("Connected", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(k.button("Disconnect")).toBeVisible();
    await expect(page.getByText("KM7Q-4HTX")).toHaveCount(0);
  });

  test("the code runs out", async ({ page }) => {
    await planner(page);
    await fakeApi(page);
    await at(page, "2026-10-19T19:00");
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await k.press("Connect the cook's Telegram");
    await k.press("Connect");
    await expect(page.getByText("KM7Q-4HTX")).toBeVisible();
    await at(page, "2026-10-19T19:11");
    await expect(page.getByText("That code ran out")).toBeVisible({
      timeout: 10_000,
    });
    await at(page, "2026-10-19T19:00");
    await k.press("Try again");
    await expect(page.getByText("KM7Q-4HTX")).toBeVisible();
  });

  test("looks good sends now", async ({ page }) => {
    await fakeShare(page);
    await cookConnected(page);
    const api = await fakeApi(page);
    const k = await evening(page);
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Tomorrow's sorted");
    await expect(tm).toContainText("Sent to the cook, 7:00 pm");
    await k.press("Share tomorrow");
    const [text] = await shared(page);
    const now = api.sends.filter((s) => s.at === undefined);
    expect(now).toHaveLength(1);
    expect(now[0]?.text.split("\n")).toEqual(text?.split("\n"));
  });

  test("silence is yes, and it still goes", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    const k = await evening(page);
    const tm = tomorrow(page);
    await expect(tm).toContainText("Goes to the cook at 9 pm");
    // The plan as it stands waits for 9 pm; a fuller one replaces it.
    await expect.poll(() => api.sends.at(-1)?.at).toBe(NINE_PM);
    expect(api.sends.at(-1)?.context).toBe("plan:2026-10-20");
    const before = api.sends.length;

    const name = await swapDinner(k, page);
    await expect.poll(() => api.sends.at(-1)?.text).toContain(name);
    expect(api.sends.length).toBeGreaterThan(before);
    expect(api.sends.at(-1)).toMatchObject({
      at: NINE_PM,
      context: "plan:2026-10-20",
    });
    const waiting = `m-${String(api.sends.length)}`;

    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Sent to the cook, 7:00 pm");
    expect(api.cancelled).toEqual([waiting]);
    expect(api.sends.at(-1)?.at).toBeUndefined();
    expect(api.sends.at(-1)?.text).toContain(name);
  });

  test("couldn't send", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    api.down = true;
    await evening(page);
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Tomorrow's sorted");
    await expect(tm).toContainText("Couldn't send. Try again.");
    api.down = false;
    await tm.getByRole("button", { name: "Send again" }).click();
    await expect(tm).toContainText("Sent to the cook");
  });

  test("send again after a change", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    const k = await evening(page);
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Sent to the cook");
    await tm.getByRole("button", { name: "Change" }).click();
    const name = await swapDinner(k, page);
    await expect(tm).toContainText("Changed since you sent it");
    await tm.getByRole("button", { name: "Send again" }).click();
    await expect(tm).toContainText("Sent to the cook");
    expect(api.sends.at(-1)?.text).toContain(name);
  });

  test("not connected, nothing changes", async ({ page }) => {
    await planner(page);
    const api = await fakeApi(page);
    await evening(page);
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Tomorrow's sorted");
    await expect(tm.getByRole("button", { name: "Change" })).toBeVisible();
    await expect(
      tm.getByRole("button", { name: "Share tomorrow" }),
    ).toBeVisible();
    await expect(tm).not.toContainText("Sent to");
    await expect(tm).not.toContainText("Goes to");
    expect(api.sends).toEqual([]);
  });

  test("disconnect, and the cook leaving", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    const k = await evening(page);
    await k.settings();
    await k.press("Disconnect");
    await expect(k.button("Connect the cook's Telegram")).toBeVisible();
    await k.home();
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Tomorrow's sorted");
    await expect(tm).not.toContainText("Sent to");
    expect(api.sends.filter((s) => s.at === undefined)).toEqual([]);
  });

  test("the cook left", async ({ page }) => {
    await cookConnected(page);
    const api = await fakeApi(page);
    api.gone = true;
    await evening(page);
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText(
      "The cook disconnected. Connect again in Settings.",
    );
    expect(api.sends).toEqual([]);
  });
});
