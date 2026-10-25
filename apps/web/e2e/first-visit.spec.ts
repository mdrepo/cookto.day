import { expect, test } from "./support/test.js";
import { Kitchen } from "./support/kitchen.js";

// specs/1-first-visit.md. A first visit now starts with onboarding
// (specs/65-onboarding.md, onboarding.spec.ts), which replaces "a new
// visitor sees how to start"; home's words are checked there too.

test.describe("A first visit", () => {
  test("Arabic lays the page out right to left", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();
    expect(await kitchen.taglineStartsFrom()).toBe("left");

    // Arabic is coming soon: reviewers preview it (specs/65-onboarding.md).
    await kitchen.open("ar");

    await expect(kitchen.emptyState()).toContainText(
      "اختر ما تطبخه، ثم أضف ما في مطبخك.",
    );
    expect(await kitchen.direction()).toBe("rtl");
    expect(await kitchen.taglineStartsFrom()).toBe("right");
  });
});
