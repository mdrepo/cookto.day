import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/65-onboarding.md: the parts of "where do you live" and the bar at
// the bottom of every step.

test.describe("Choices, steps and the action bar", () => {
  test("the chosen card is aubergine-tinted; a coming-soon card is dashed and can't be chosen", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("Choice", "Light, English"),
      "Chosen, and coming soon",
    );
    const singapore = example.getByRole("radio", { name: /Singapore/ });
    const india = example.getByRole("radio", { name: /India/ });
    await expect(singapore).toBeChecked();
    await expect(india).toBeDisabled();

    const chosen = example.locator("label", {
      has: page.getByRole("radio", { name: /Singapore/ }),
    });
    const c = await kit.drawn(chosen);
    expect(c.background).toBe(await kit.token(chosen, "accent-soft"));
    expect(c.borderColour).toBe(await kit.token(chosen, "accent"));

    const soon = example.locator("label", {
      has: page.getByRole("radio", { name: /India/ }),
    });
    expect((await kit.drawn(soon)).borderStyle).toBe("dashed");
    await soon.click({ force: true });
    await expect(singapore).toBeChecked();
    await expect(india).not.toBeChecked();
  });

  test("a choice's radio sits at its start, on the right in Arabic", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, radioFirst] of [
      ["Light, English", true],
      ["Light, Arabic", false],
    ] as const) {
      const example = kit.example(
        kit.panel("Choice", panel),
        "Chosen, and coming soon",
      );
      const radio = example.getByRole("radio").first();
      const title = example.locator("label strong").first();
      expect(await kit.leftOf(radio, title), panel).toBe(radioFirst);
    }
  });

  test("steps fill up to this one", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("Steps", "Light, English"),
      "Step 1 of 2",
    );
    await expect(example.locator("p")).toHaveText("Step 1 of 2");
    const bars = example.locator('[aria-hidden="true"] > *');
    await expect(bars).toHaveCount(2);
    expect((await kit.drawn(bars.nth(0))).background).toBe(
      await kit.token(bars.nth(0), "accent"),
    );
    expect((await kit.drawn(bars.nth(1))).background).toBe(
      await kit.token(bars.nth(1), "border"),
    );
  });

  test("in the action bar, the main action takes the room", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("ActionBar", "Light, English"),
      "Back and next",
    );
    const back = await kit.drawn(example.getByRole("button", { name: "Back" }));
    const next = await kit.drawn(example.getByRole("button", { name: "Next" }));
    expect(Number(next.width)).toBeGreaterThan(Number(back.width));
    expect(Number(next.height)).toBeGreaterThanOrEqual(44);
    await expect(
      example.getByRole("button", { name: "Skip for now" }),
    ).toBeVisible();
  });

  test("a plain button has no frame, and aubergine words", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const button = kit
      .example(kit.panel("Button", "Light, English"), "Plain")
      .getByRole("button");
    const drawn = await kit.drawn(button);
    expect(drawn.borderStyle).toBe("none");
    expect(drawn.colour).toBe(await kit.token(button, "accent"));
    expect(Number(drawn.height)).toBeGreaterThanOrEqual(44);
  });
});
