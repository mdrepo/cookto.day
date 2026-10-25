import { expect, type Locator, test } from "./support/test.js";
import { Onboarding } from "./support/onboarding.js";

// specs/80-look.md: taps answer with a little movement (micro animations,
// asked for on 16 Oct), and nothing moves for people who turn motion down.

/** The longest transition on an element, in seconds. */
const transition = (el: Locator) =>
  el.evaluate((node) =>
    Math.max(
      ...getComputedStyle(node)
        .transitionDuration.split(",")
        .map((d) => parseFloat(d)),
    ),
  );

/** The animation the tick in a pressed chip plays as it appears. */
const tickAnimation = (chip: Locator) =>
  chip.locator("svg").evaluate((svg) => getComputedStyle(svg).animationName);

test.describe("Motion", () => {
  test("taps answer with a little movement, unless motion is turned down", async ({
    page,
  }) => {
    const start = new Onboarding(page);
    await start.open();
    await start.next();
    const breakfast = start.meal("Adult", "Breakfast");
    const next = start.button("Next");
    for (const el of [breakfast, next])
      expect(await transition(el)).toBeGreaterThan(0.05);
    await breakfast.click();
    await expect(breakfast).toHaveAttribute("aria-pressed", "true");
    expect(await tickAnimation(breakfast)).not.toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const el of [breakfast, next])
      expect(await transition(el)).toBeLessThan(0.001);
  });
});
