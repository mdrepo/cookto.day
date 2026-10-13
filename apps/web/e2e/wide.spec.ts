import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// Wide screens, like a laptop: the same app in panes, as tablet apps do. The
// bottom bar becomes a rail at the side, Today shows "Use soon" beside the
// picks, and the bottom sheet becomes a dialog in the middle. Phones keep
// the one column (every other test).

test.describe("On a wide screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("the bar is a rail down the side", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    const tab = (name: string) =>
      k.tabs().getByRole("button", { name, exact: true }).boundingBox();
    const [today, fridge] = [await tab("Today"), await tab("Fridge")];
    if (!today || !fridge) throw new Error("no tabs");
    expect(fridge.y).toBeGreaterThan(today.y);
    expect(Math.round(fridge.x)).toBe(Math.round(today.x));
    expect(today.x).toBeLessThan(200);
  });

  test("Today shows Use soon beside the picks", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.loadNorthIndianWithStaples();
    await k.add("Spinach", { value: "250", unit: "g" });
    await k.add("Paneer", { value: "200", unit: "g" });
    await k.mark("Spinach", "Past its best");
    await k.home();
    const soon = await page
      .getByRole("region", { name: "Use soon" })
      .boundingBox();
    const cook = await page
      .getByRole("region", { name: "Cook today" })
      .boundingBox();
    if (!soon || !cook) throw new Error("no panes");
    expect(soon.x).toBeGreaterThan(cook.x + cook.width - 1);
    expect(Math.abs(soon.y - cook.y)).toBeLessThan(8);
  });

  test("a row opens a dialog in the middle, not a sheet at the bottom", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.open("Spinach");
    const box = await k.sheet("Spinach").boundingBox();
    if (!box) throw new Error("no dialog");
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(4);
    expect(800 - (box.y + box.height)).toBeGreaterThan(100);
    expect(box.width).toBeLessThanOrEqual(480);
  });
});
