import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/207-connect-the-cook.md: connect the cook's Telegram from Settings,
// and tomorrow's plan reaches her by itself. The API is faked in the
// browser (ADR 0025): the test is the server.

/** The household's clock, "YYYY-MM-DDTHH:MM", in the phone's own time. */
const at = (page: Page, time: string) =>
  page.clock.setFixedTime(new Date(`${time}:00`));

/** When a code made at 7 pm runs out: ten minutes on, as the API says it. */
const CODE_RUNS_OUT = new Date("2026-10-19T19:10:00").toISOString();
/** 9 pm on that evening, as the API wants it. */
const NINE_PM = new Date("2026-10-19T21:00:00").toISOString();

const tomorrow = (page: Page) => page.getByRole("region", { name: "Tomorrow" });

interface Sent {
  text: string;
  at?: string;
  context?: string;
}

/** The API, as the test plays it: a link, its state, sends and cancels. */
async function fakeApi(page: Page) {
  const state = {
    connected: false,
    down: false,
    gone: false,
    sends: [] as Sent[],
    cancelled: [] as string[],
  };
  await page.route("**/api/messenger/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (state.down) {
      await route.abort("failed");
      return;
    }
    if (method === "POST" && path === "/api/messenger/links") {
      await json(201, {
        code: "KM7Q4HTX",
        token: "tok-for-the-test",
        expiresAt: CODE_RUNS_OUT,
      });
      return;
    }
    if (method === "GET" && path.startsWith("/api/messenger/links/")) {
      await json(200, { state: state.connected ? "connected" : "waiting" });
      return;
    }
    if (method === "DELETE" && path === "/api/messenger/links") {
      await route.fulfill({ status: 204 });
      return;
    }
    if (method === "POST" && path === "/api/messenger/send") {
      if (state.gone) {
        await json(404, { error: "gone" });
        return;
      }
      state.sends.push(request.postDataJSON() as Sent);
      await json(202, { id: `m-${String(state.sends.length)}` });
      return;
    }
    if (method === "DELETE" && path.startsWith("/api/messenger/send/")) {
      state.cancelled.push(path.split("/").pop() ?? "");
      await route.fulfill({ status: 204 });
      return;
    }
    await json(404, { error: "not-found" });
  });
  return state;
}

/** The share sheet, faked: what was shared, and nothing leaves the test. */
async function fakeShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { shared: string[] };
    w.shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: { text: string }) => {
        w.shared.push(data.text);
        return Promise.resolve();
      },
    });
  });
}

const shared = (page: Page) =>
  page.evaluate(() => (window as unknown as { shared: string[] }).shared);

/** This phone plans the meals, with the cook already connected. */
async function cookConnected(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("cookto.day:role", "plan");
    localStorage.setItem(
      "cookto.day:cook",
      JSON.stringify({
        token: "tok-for-the-test",
        connectedAt: "2026-10-19T10:00:00.000Z",
        sent: null,
        scheduled: null,
      }),
    );
  });
}

async function planner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("cookto.day:role", "plan");
  });
}

/** A planner's evening at 7 pm with a kitchen loaded. */
async function evening(page: Page): Promise<Cooking> {
  await at(page, "2026-10-19T19:00");
  const k = new Cooking(page);
  await k.start();
  await k.loadNorthIndianWithStaples();
  await k.home();
  await expect(tomorrow(page)).toBeVisible();
  return k;
}

/** Another idea for dinner; the dish's name. */
async function swapDinner(k: Cooking, page: Page): Promise<string> {
  const dinner = tomorrow(page).getByRole("article", { name: "Dinner" });
  await dinner.getByRole("button", { name: "Other ideas" }).click();
  const idea = dinner
    .getByRole("list", { name: "Other ideas" })
    .getByRole("button")
    .first();
  const name = await k.nameOf(idea);
  await idea.click();
  return name;
}

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
