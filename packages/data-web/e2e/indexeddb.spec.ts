import { expect, type Page, test } from "@playwright/test";
import { RECORD_STORE_CONTRACT } from "@cookto/testing/record-store-contract";
import type { Answer, Call } from "./page.js";

// specs/61-saving-data.md, criterion 4: the browser keeps it, on every
// device. The record store contract runs here, in Node, against the real
// IndexedDB in each browser, through the page's window.recordStore.

declare global {
  interface Window {
    recordStore(call: Call): Promise<Answer>;
    resetRecords(): Promise<void>;
  }
}

/** A record store whose every call runs in the page. */
function inPage(page: Page) {
  async function call(
    method: Call["method"],
    args: unknown[],
    signal?: AbortSignal,
  ) {
    const answer = await page.evaluate((c) => window.recordStore(c), {
      method,
      args,
      aborted: signal?.aborted ?? false,
    });
    if (answer.ok) return answer.value;
    const error = new Error(answer.message);
    error.name = answer.name;
    throw error;
  }
  return {
    get: <T>(collection: string, id: string, signal?: AbortSignal) =>
      call("get", [collection, id], signal) as Promise<T | null>,
    all: <T>(collection: string, signal?: AbortSignal) =>
      call("all", [collection], signal) as Promise<T[]>,
    put: async (collection: string, records: readonly { id: string }[]) => {
      await call("put", [collection, records]);
    },
    clear: async (collection: string) => {
      await call("clear", [collection]);
    },
  };
}

test.describe("the IndexedDB record store", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => "recordStore" in window, null, {
      timeout: 10_000,
    });
  });

  for (const { name, check } of RECORD_STORE_CONTRACT)
    test(name, async ({ page }) => {
      await check(async () => {
        await page.evaluate(() => window.resetRecords());
        return inPage(page);
      });
    });

  test("what it saved is still there after the page reloads", async ({
    page,
  }) => {
    await page.evaluate(() => window.resetRecords());
    const record = {
      id: "a",
      version: 1,
      updatedAt: "2026-10-13T08:00:00.000Z",
      deletedAt: null,
      text: "kept",
    };
    await inPage(page).put("notes", [record]);
    await page.reload();
    await page.waitForFunction(() => "recordStore" in window, null, {
      timeout: 10_000,
    });
    expect(await inPage(page).get("notes", "a")).toEqual(record);
  });
});
