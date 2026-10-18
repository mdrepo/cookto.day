import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// #80, the look: lunch and dinner side by side on a wide screen, Dishes is a
// tab with no Back, and a warmer dark.

test.describe("The look, polished", () => {
  test("on a wide screen, lunch and dinner sit side by side", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.home();
    const lunch = await k.pick("Lunch").boundingBox();
    const dinner = await k.pick("Dinner").boundingBox();
    if (!lunch || !dinner) throw new Error("no picks");
    expect(Math.abs(lunch.y - dinner.y)).toBeLessThan(2);
    expect(dinner.x).toBeGreaterThan(lunch.x + lunch.width - 1);
  });

  test("Dishes is a tab: no Back", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k
      .tabs()
      .getByRole("button", { name: "My dishes", exact: true })
      .click();
    await expect(k.title()).toHaveText("My dishes");
    await expect(k.button("Back")).toHaveCount(0);
  });

  test("dark is warm: a brown page, not grey", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const k = new Cooking(page);
    await k.start();
    const rgb = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    const [r = 0, g = 0, b = 0] = (rgb.match(/\d+/g) ?? []).map(Number);
    // Warm: clearly more red than blue.
    expect(r - b).toBeGreaterThanOrEqual(8);
    expect(r).toBeGreaterThan(g);
  });
});
