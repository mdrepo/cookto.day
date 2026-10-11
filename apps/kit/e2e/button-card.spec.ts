import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/29-button-card.md

test.describe("Buttons say what they do and when they're busy; cards hold one thing", () => {
  test("the main action is aubergine, in light and dark", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const button = kit
        .example(kit.panel("Button", panel), "Main")
        .getByRole("button", { name: "Add a bill" });
      const drawn = await kit.drawn(button);
      expect(drawn.background, panel).toBe(await kit.token(button, "accent"));
      expect(drawn.colour, panel).toBe(await kit.token(button, "on-accent"));
      expect(drawn.height, panel).toBeGreaterThanOrEqual(44);
    }
  });

  test("quiet and danger buttons look less important, and different", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const panel = kit.panel("Button", "Light, English");
    const quiet = kit
      .example(panel, "Quiet")
      .getByRole("button", { name: "Cancel" });
    const danger = kit
      .example(panel, "Danger")
      .getByRole("button", { name: "Remove" });
    const accent = await kit.token(quiet, "accent");

    const q = await kit.drawn(quiet);
    expect(q.borderStyle).toBe("solid");
    expect(q.colour).toBe(accent);
    expect(q.background).toBe(await kit.token(quiet, "surface"));

    const d = await kit.drawn(danger);
    expect(d.borderStyle).toBe("solid");
    expect(d.colour).toBe(await kit.token(danger, "warn"));
    expect(d.borderColour).toBe(await kit.token(danger, "warn"));
    expect(d.background).not.toBe(accent);
  });

  test("a busy button says so, and can't be pressed twice", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(kit.panel("Button", "Light, English"), "Busy");
    const button = example.getByRole("button", { name: "Saving" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    const circle = button.getByTestId("busy");
    await expect(circle).toBeVisible();
    expect(await kit.animationRuns(circle)).toBe("infinite");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await kit.animationRuns(circle)).toBe("1");
  });

  test("a disabled button can't be pressed, and looks it", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const button = kit
      .example(kit.panel("Button", "Light, English"), "Disabled")
      .getByRole("button", { name: "Save" });
    await expect(button).toBeDisabled();
    expect(await kit.focusable(button)).toBe(false);
    expect((await kit.drawn(button)).colour).toBe(
      await kit.token(button, "text-muted"),
    );
  });

  test("a button can have an icon, or be only an icon", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, words, remove, iconFirst] of [
      ["Light, English", "Add a bill", "Remove", true],
      ["Light, Arabic", "أضف فاتورة", "إزالة", false],
    ] as const) {
      const p = kit.panel("Button", panel);
      const button = kit
        .example(p, "With an icon")
        .getByRole("button", { name: words });
      const icon = button.locator("svg");
      expect(await kit.leftOf(icon, button.getByText(words)), panel).toBe(
        iconFirst,
      );
      const { stroke, text } = await kit.strokeAndText(icon);
      expect(stroke, panel).toBe(text);

      const only = kit
        .example(p, "Icon only")
        .getByRole("button", { name: remove, exact: true });
      const drawn = await kit.drawn(only);
      expect([drawn.width, drawn.height], panel).toEqual([44, 44]);
    }
  });

  test("a card holds one thing, named by its title", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const card = kit
        .example(kit.panel("Card", panel), "A dish")
        .getByRole("article", { name: "Palak paneer" });
      await expect(card).toBeVisible();
      const drawn = await kit.drawn(card);
      expect(drawn.background, panel).toBe(await kit.token(card, "surface"));
      expect(drawn.borderStyle, panel).toBe("solid");
      expect(drawn.radius, panel).toBe("16px");
    }
  });
});
