import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/35-iphone.md, criterion 2. It runs on every project, the iPhone
// included (ADR 0021); criterion 1 is every other test passing there too.

test.describe("Everything works on an iPhone too", () => {
  test("the language list is easy to tap on an iPhone", async ({ page }) => {
    const kitchen = new Kitchen(page);
    // The language list is in Settings since #84.
    await kitchen.openSettings();
    const list = await kitchen.languageList();
    expect(list.height).toBeGreaterThanOrEqual(44);
    expect(list.radius).toBe("8px");
    expect(list.border).toBe("solid 1px");
    expect(list.arrow).toBe("right");

    await kitchen.openSettings("ar");
    expect((await kitchen.languageList()).arrow).toBe("left");
  });
});
