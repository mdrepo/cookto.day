import { expect, type Page, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/103-shopping-list.md: a shopping list from what dishes need.

/** A kitchen where Palak paneer needs only cream, onion and tomato. */
async function palakNeedsThree(k: Cooking) {
  await k.start();
  await k.loadNorthIndianWithStaples();
  for (const food of ["Spinach", "Paneer", "Green chilli", "Garlic", "Ginger"])
    await k.add(food);
}

const list = (page: Page) => page.getByRole("list", { name: "Shopping list" });
const onList = (page: Page) => list(page).getByRole("listitem");

/** From anywhere: the Fridge's "Shopping list (n)", then the list. */
async function openList(k: Cooking, page: Page, n?: number) {
  await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
  await page
    .getByRole("button", {
      name:
        n === undefined
          ? /^Shopping list \(\d+\)$/
          : `Shopping list (${String(n)})`,
    })
    .click();
  await expect(k.title()).toHaveText("Shopping list");
}

test.describe("The shopping list", () => {
  test("add what a dish needs", async ({ page }) => {
    const k = new Cooking(page);
    await palakNeedsThree(k);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await expect(page.getByRole("main")).toContainText("Added 3 to your list");
    // Aloo gobi needs onion too: it's listed once.
    await k.openDish("Aloo gobi");
    await k.press("Add to my list");
    await openList(k, page);
    await expect(onList(page).filter({ hasText: /^Onion$/ })).toHaveCount(1);
    await expect(onList(page).filter({ hasText: /^Cream$/ })).toHaveCount(1);
  });

  test("the list, beside the fridge", async ({ page }) => {
    const k = new Cooking(page);
    await palakNeedsThree(k);
    await expect(
      page.getByRole("button", { name: /^Shopping list/ }),
    ).toHaveCount(0);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await openList(k, page, 3);
    // In the recipe's order.
    await expect(onList(page)).toHaveText(["Onion", "Tomato", "Cream"]);
  });

  test("tick it off, and it's in the fridge", async ({ page }) => {
    const k = new Cooking(page);
    await palakNeedsThree(k);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await openList(k, page, 3);
    // Ticking takes the row away, so click: check() would wait to see it
    // ticked, and under load the row is already gone.
    await page.getByRole("checkbox", { name: "Onion" }).click();
    await expect(onList(page)).toHaveText(["Tomato", "Cream"]);
    await page.reload();
    await expect(onList(page)).toHaveText(["Tomato", "Cream"]);
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await expect(k.item("Onion")).toBeVisible();
  });

  test("add anything", async ({ page }) => {
    const k = new Cooking(page);
    await palakNeedsThree(k);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await openList(k, page, 3);
    await page.getByRole("textbox", { name: "Name" }).fill("Bread");
    await k.press("Add");
    await expect(onList(page)).toHaveText([
      "Onion",
      "Tomato",
      "Cream",
      "Bread",
    ]);
  });

  test("send it", async ({ page }) => {
    // The phone's share sheet and the clipboard, faked: tests stay offline.
    await page.addInitScript(() => {
      const w = window as unknown as { shared: string[]; copied: string[] };
      w.shared = [];
      w.copied = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: { text: string }) => {
          w.shared.push(data.text);
          return Promise.resolve();
        },
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: (text: string) => {
            w.copied.push(text);
            return Promise.resolve();
          },
        },
      });
    });
    const k = new Cooking(page);
    await palakNeedsThree(k);
    await k.openDish("Palak paneer");
    await k.press("Add to my list");
    await openList(k, page, 3);
    await k.press("Send the list");
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { shared: string[] }).shared),
      )
      .toEqual(["Onion\nTomato\nCream"]);

    // No share sheet (most laptops): it's copied instead.
    await page.evaluate(() => {
      // Not deleted: WebKit has its own share under ours.
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
    });
    await k.press("Send the list");
    await expect(page.getByRole("main")).toContainText("Copied");
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string[] }).copied,
      ),
    ).toEqual(["Onion\nTomato\nCream"]);
  });
});
