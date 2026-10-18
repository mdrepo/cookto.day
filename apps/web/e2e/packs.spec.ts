import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/147-packs.md: a Maharashtrian pack and an Our kitchen pack; poha and
// bhel puri move, and nobody loses them.

/**
 * A household from before this change: onboarded, North Indian loaded, and
 * poha cooked today, saved the way the app saved them then.
 */
async function loadedBefore(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem("cookto.day:onboarded") !== null) return;
    localStorage.setItem("cookto.day:onboarded", "yes");
    localStorage.setItem(
      "cookto.day:kitchen",
      JSON.stringify({ cuisines: ["north-indian"], skip: [], sample: null }),
    );
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const d = new Date();
    const two = (n: number) => String(n).padStart(2, "0");
    const on = `${String(d.getFullYear())}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("cookto.day", 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore("records", { keyPath: ["c", "id"] });
      };
      open.onsuccess = () => {
        resolve(open.result);
      };
      open.onerror = () => {
        reject(new Error("couldn't open the app's store"));
      };
    });
    const tx = db.transaction("records", "readwrite");
    tx.objectStore("records").put({
      c: "cooked",
      id: "before-147",
      record: {
        id: "before-147",
        dish: "poha",
        on,
        version: 1,
        updatedAt: d.toISOString(),
        deletedAt: null,
      },
    });
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    db.close();
  });
  await page.reload();
}

test.describe("Packs", () => {
  test("the new packs", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Choose what you cook");
    for (const cuisine of ["North Indian", "Maharashtrian", "Our kitchen"])
      await expect(k.card(cuisine)).toBeVisible();
    await k.load("North Indian");
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.dishes().first()).toBeVisible();
    await expect(k.dishes().filter({ hasText: /^Poha/ })).toHaveCount(0);
    await expect(k.dishes().filter({ hasText: /^Bhel puri/ })).toHaveCount(0);
  });

  test("nothing lost", async ({ page }) => {
    await loadedBefore(page);
    const k = new Cooking(page);
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.dishes().filter({ hasText: /^Poha/ })).toHaveCount(1);
    await k.openDish("Poha");
    await expect(page.getByRole("main")).toContainText("Cooked today");
    await k.tabs().getByRole("button", { name: "Today" }).click();
    await k.press("Choose what you cook");
    await expect(k.card("Maharashtrian")).toContainText("Loaded");
  });

  test("serve with pita", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Chole");
    for (const part of ["Rice", "Roti", "Bhature", "Pita"])
      await expect(page.getByRole("main")).toContainText(
        new RegExp(`Serve with .*${part}`),
      );
  });
});
