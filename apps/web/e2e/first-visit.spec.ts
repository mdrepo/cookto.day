import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/1-first-visit.md

test.describe("A first visit", () => {
  test("a new visitor sees how to start", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();

    await expect(kitchen.title()).toHaveText("cookto.day");
    await expect(kitchen.emptyState()).toContainText(
      "Add a grocery bill to see what you can cook today",
    );
  });

  test("Arabic lays the page out right to left", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();
    expect(await kitchen.taglineStartsFrom()).toBe("left");

    // Arabic is coming soon: reviewers preview it (specs/65-onboarding.md).
    await kitchen.open("ar");

    await expect(kitchen.emptyState()).toContainText(
      "أضف فاتورة بقالة لترى ما يمكنك طبخه اليوم",
    );
    expect(await kitchen.direction()).toBe("rtl");
    expect(await kitchen.taglineStartsFrom()).toBe("right");
  });
});
