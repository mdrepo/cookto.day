import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/14-foundation.md

test.describe("Every screen works with a keyboard and reads well in every script", () => {
  test("keyboard focus is easy to see", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();

    await kitchen.tabToLanguageList();

    const outline = await kitchen.focusOutline();
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.offset).toBeGreaterThan(0);
    expect(outline.colour).toBe(outline.actionColour);
  });

  test("Hindi, Marathi and Arabic get taller lines", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();
    expect(await kitchen.lineHeight()).toBeCloseTo(1.5, 1);

    for (const language of ["हिन्दी", "मराठी", "العربية"]) {
      await kitchen.chooseLanguage(language);
      expect(await kitchen.lineHeight(), language).toBeCloseTo(1.7, 1);
    }
  });
});
