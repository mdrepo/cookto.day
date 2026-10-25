import { expect, type Page } from "@playwright/test";
import { Cooking } from "./cooking.js";
import { fakeHouseholdApi, householdServer, signIn } from "./household.js";

// Receipt photos (specs/129), as the browser tests play them: the API's
// read faked in the page, a made-up receipt (never a real one: receipts
// carry names and card digits), and a photo the page itself draws.

export interface ReceiptLine {
  name: string;
  qty: number;
  amount: number;
  check: boolean;
}

/** What the API answers next: the lines, or a refusal. */
export type Answer =
  | { status: 200; date?: string; lines: ReceiptLine[] }
  | { status: number; error: string; limit?: string }
  | "offline";

export const line = (name: string, qty = 1, check = false): ReceiptLine => ({
  name,
  qty,
  amount: 1,
  check,
});

/** POST /api/receipts/read, faked: each read's type and size, kept. */
export async function fakeReceipts(page: Page) {
  const state: { next: Answer; reads: { type: string; bytes: number }[] } = {
    next: { status: 200, lines: [] },
    reads: [],
  };
  await page.route("**/api/receipts/read", async (route) => {
    const request = route.request();
    state.reads.push({
      type: request.headers()["content-type"] ?? "",
      bytes: request.postDataBuffer()?.length ?? 0,
    });
    const next = state.next;
    if (next === "offline") {
      await route.abort("failed");
      return;
    }
    const body =
      "lines" in next
        ? { shop: "Corner Store", date: next.date, lines: next.lines }
        : { error: next.error, limit: next.limit };
    await route.fulfill({
      status: next.status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return state;
}

/** A small JPEG the page draws, as a phone's camera would hand one over. */
async function photo(page: Page): Promise<Buffer> {
  const url = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 60;
    const g = canvas.getContext("2d");
    if (g) {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, 40, 60);
      g.fillStyle = "#000";
      g.fillRect(5, 10, 30, 2);
    }
    return canvas.toDataURL("image/jpeg");
  });
  return Buffer.from(url.split(",")[1] ?? "", "base64");
}

/** Presses `button` and hands the phone's picker a photo of a receipt. */
export async function choosePhoto(page: Page, button: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: button, exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "receipt.jpg",
    mimeType: "image/jpeg",
    buffer: await photo(page),
  });
}

/** Signed in, North Indian and its staples loaded, on Today, at 10 am. */
export async function signedInKitchen(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-25T10:00:00"));
  const s = householdServer();
  await fakeHouseholdApi(page, s);
  const reads = await fakeReceipts(page);
  const k = new Cooking(page);
  await k.start();
  await k.settings();
  await signIn(page, s, "Mayur");
  await k.home();
  await k.loadNorthIndianWithStaples();
  await k.home();
  return { k, reads, s };
}

export const found = (page: Page) =>
  page.getByRole("list", { name: "Found in your receipt" });

export const notSure = (page: Page) =>
  page.getByRole("list", { name: "Not sure" });

/** A row of "Found in your receipt" or "Not sure", by its line's food. */
export const row = (page: Page, list: "found" | "not-sure", name: string) =>
  (list === "found" ? found(page) : notSure(page))
    .getByRole("listitem")
    .filter({ hasText: name });

/** Waits for "Found in your receipt". */
export async function sawFound(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Found in your receipt", level: 1 }),
  ).toBeVisible({ timeout: 10_000 });
}
