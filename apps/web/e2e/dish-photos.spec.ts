import { expect, type Locator, test } from "./support/test.js";
import { Cooking } from "./support/cooking.js";

// specs/118-dish-photos.md: dish photos, free licence, loaded lazily.

/** Whether an image has arrived and been drawn. */
const loaded = (img: Locator) =>
  img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);

test.describe("Dish photos", () => {
  test("a dish's page has its photo", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.openDish("Palak paneer");
    const photo = page.getByRole("main").getByRole("img", {
      name: "Palak paneer",
    });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(page.getByRole("main")).toContainText(
      "Photo: DreamyFlutura11, CC BY-SA 4.0",
    );
    await expect(
      page.getByRole("link", { name: /DreamyFlutura11/ }),
    ).toHaveAttribute(
      "href",
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
    );
  });

  test("Dishes shows small photos, and loads only what you see", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.title()).toHaveText("My dishes");
    const rows = k.dishes();
    await expect(rows).toHaveCount(28);
    await expect(rows.locator("img")).toHaveCount(28);
    for (const lazy of await rows.locator("img").all())
      await expect(lazy).toHaveAttribute("loading", "lazy");
    await expect.poll(() => loaded(rows.first().locator("img"))).toBe(true);
    // Each loads when the browser judges it near the screen: Chrome looks
    // further ahead than Safari, so how many arrive at first differs.
    await rows.last().scrollIntoViewIfNeeded();
    await expect.poll(() => loaded(rows.last().locator("img"))).toBe(true);
  });

  test("nothing jumps", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    // Photos arrive late, so the page draws first without them.
    await page.route("**/*.webp", async (route) => {
      await new Promise((done) => setTimeout(done, 1500));
      await route.continue();
    });
    await k.openDish("Palak paneer");
    const below = k.dishList("You need");
    await expect(below).toBeVisible();
    const before = (await below.boundingBox())?.y;
    const photo = page.getByRole("main").getByRole("img", {
      name: "Palak paneer",
    });
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
    expect((await below.boundingBox())?.y).toBe(before);
  });
});
