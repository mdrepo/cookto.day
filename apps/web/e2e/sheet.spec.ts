import { expect, test } from "@playwright/test";
import { Cooking } from "./support/cooking.js";

// The bottom sheet, for one hand: it closes when you tap outside it, its
// controls are as wide as the sheet, and it ends above the phone's edge.
// The bottom bar sits at the bottom of the screen, even on a short page.

test.describe("The bottom sheet, for one hand", () => {
  test("tapping outside it closes it", async ({ page }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.open("Spinach");
    await page.mouse.click(20, 20);
    await expect(k.sheet("Spinach")).toBeHidden();
  });

  test("its controls are as wide as the sheet, and it ends above the edge", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    await k.press("Try a sample kitchen");
    await k.tabs().getByRole("button", { name: "Fridge", exact: true }).click();
    await k.open("Spinach");
    const sheet = k.sheet("Spinach");
    const box = async (name: "How it is" | "Change amount" | "Used up") => {
      const el =
        name === "How it is"
          ? sheet.getByRole("combobox", { name })
          : sheet.getByRole("button", { name });
      const b = await el.boundingBox();
      if (!b) throw new Error(`no ${name}`);
      return b;
    };
    const select = await box("How it is");
    const change = await box("Change amount");
    const usedUp = await box("Used up");
    // The two buttons share the row, edge to edge with the select.
    expect(Math.round(change.x)).toBe(Math.round(Math.min(select.x, usedUp.x)));
    expect(
      Math.round(Math.max(change.x + change.width, usedUp.x + usedUp.width)),
    ).toBe(Math.round(select.x + select.width));
    expect(Math.abs(change.width - usedUp.width)).toBeLessThanOrEqual(1);
    const view = page.viewportSize();
    if (!view) throw new Error("no viewport");
    expect(view.height - (usedUp.y + usedUp.height)).toBeGreaterThanOrEqual(24);
  });

  test("the bottom bar sits at the bottom of the screen, even on a short page", async ({
    page,
  }) => {
    const k = new Cooking(page);
    await k.start();
    const bar = await k.tabs().boundingBox();
    const view = page.viewportSize();
    if (!bar || !view) throw new Error("nothing to measure");
    expect(Math.round(bar.y + bar.height)).toBe(view.height);
  });
});
