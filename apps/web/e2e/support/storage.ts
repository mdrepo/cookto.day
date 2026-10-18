import type { Page } from "@playwright/test";

// The browser's own storage failing (specs/138). Nothing of ours is faked:
// IndexedDB itself refuses to save, as it does when a phone is full.

type Saved = Window & { realPut?: PropertyDescriptor | undefined };

/** From now on, saving fails: "full" as on a phone out of space. */
export async function storageFails(
  page: Page,
  how: "full" | "broken",
): Promise<void> {
  await page.evaluate(
    (name) => {
      const saved = window as Saved;
      saved.realPut ??= Object.getOwnPropertyDescriptor(
        IDBObjectStore.prototype,
        "put",
      );
      Object.defineProperty(IDBObjectStore.prototype, "put", {
        configurable: true,
        writable: true,
        // As a full disk does: the transaction ends, and the save fails.
        value: function (this: IDBObjectStore) {
          this.transaction.abort();
          throw new DOMException("Saving failed", name);
        },
      });
    },
    how === "full" ? "QuotaExceededError" : "UnknownError",
  );
}

/** Saving works again. */
export async function storageWorks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const saved = window as Saved;
    if (saved.realPut)
      Object.defineProperty(IDBObjectStore.prototype, "put", saved.realPut);
  });
}
