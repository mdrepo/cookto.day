import { expect, type Page, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// specs/175-more.md, criteria 2 and 3: Packs is a library; My dishes is what
// this family cooks.

/** From anywhere after setup: More, Packs, then a pack's dishes. */
async function openPack(k: Cooking, pack: string, count: string) {
  await k.tabs().getByRole("button", { name: "More", exact: true }).click();
  await k.press("Packs");
  await k.card(pack).getByRole("button", { name: count }).click();
  await expect(k.title()).toHaveText(pack);
}

const packDishes = (page: Page) =>
  page.getByRole("list", { name: "Dishes" }).getByRole("listitem");

test.describe("Packs", () => {
  test("a pack, the first time: its dishes are all in My dishes", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await openPack(k, "Maharashtrian", "8 dishes");
    await expect(packDishes(page)).toHaveCount(8);
    for (const row of await packDishes(page).all())
      await expect(row).toContainText("In My dishes");
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.dishes()).toHaveCount(8);
  });

  test("taking a dish out, and back, keeps what was cooked", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await openPack(k, "Maharashtrian", "8 dishes");
    await k.openDish("Poha");
    await k.press("We cooked this");
    await expect(page.getByText("Cooked today")).toBeVisible();

    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await k.takeOut("Poha");
    await expect(k.dishes().filter({ hasText: /^Poha/ })).toHaveCount(0);
    await k.home();
    await expect(page.getByRole("main")).not.toContainText("Poha");

    await openPack(k, "Maharashtrian", "8 dishes");
    const poha = packDishes(page).filter({ hasText: /^Poha/ });
    await expect(poha).not.toContainText("In My dishes");
    await poha.getByRole("button", { name: "Add Poha" }).click();
    await expect(poha).toContainText("In My dishes");

    await k.openDish("Poha");
    await expect(page.getByText("Cooked today")).toBeVisible();
  });
});
