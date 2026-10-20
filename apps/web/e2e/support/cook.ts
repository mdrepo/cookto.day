import { expect, type Page } from "@playwright/test";
import { Cooking } from "./cooking.js";

// The cook's Telegram, as the browser tests play it (specs/207): the API
// faked in the page (ADR 0025), the share sheet faked, a planner's evening.

/** The household's clock, "YYYY-MM-DDTHH:MM", in the phone's own time. */
export const at = (page: Page, time: string) =>
  page.clock.setFixedTime(new Date(`${time}:00`));

/** When a code made at 7 pm runs out: ten minutes on, as the API says it. */
export const CODE_RUNS_OUT = new Date("2026-10-19T19:10:00").toISOString();
/** 9 pm on that evening, as the API wants it. */
export const NINE_PM = new Date("2026-10-19T21:00:00").toISOString();

export const tomorrow = (page: Page) =>
  page.getByRole("region", { name: "Tomorrow" });

export interface Sent {
  text: string;
  at?: string;
  context?: string;
}

/** The API, as the test plays it: a link, its state, sends and cancels. */
export async function fakeApi(page: Page) {
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
export async function fakeShare(page: Page): Promise<void> {
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

export const shared = (page: Page) =>
  page.evaluate(() => (window as unknown as { shared: string[] }).shared);

/** This phone plans the meals, with the cook already connected. */
export async function cookConnected(page: Page): Promise<void> {
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

export async function planner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("cookto.day:role", "plan");
  });
}

/** A planner's evening at 7 pm with a kitchen loaded. */
export async function evening(page: Page): Promise<Cooking> {
  await at(page, "2026-10-19T19:00");
  const k = new Cooking(page);
  await k.start();
  await k.loadNorthIndianWithStaples();
  await k.home();
  await expect(tomorrow(page)).toBeVisible();
  return k;
}

/** Another idea for dinner; the dish's name. */
export async function swapDinner(k: Cooking, page: Page): Promise<string> {
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
