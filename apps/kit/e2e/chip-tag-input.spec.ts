import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/65-onboarding.md: the parts onboarding's "who eats" is built from.

test.describe("Chips tick, tags label, inputs take a name", () => {
  test("a ticked chip is aubergine with a tick; an unticked one is plain", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const ticked = kit
        .example(kit.panel("Chip", panel), "Ticked")
        .getByRole("button", { name: "Lunch" });
      await expect(ticked).toHaveAttribute("aria-pressed", "true");
      const on = await kit.drawn(ticked);
      expect(on.background, panel).toBe(await kit.token(ticked, "accent"));
      expect(on.colour, panel).toBe(await kit.token(ticked, "on-accent"));
      expect(on.height, panel).toBeGreaterThanOrEqual(44);
      await expect(ticked.locator("svg")).toBeVisible();

      const plain = kit
        .example(kit.panel("Chip", panel), "Not ticked")
        .getByRole("button", { name: "Dinner" });
      await expect(plain).toHaveAttribute("aria-pressed", "false");
      const off = await kit.drawn(plain);
      expect(off.background, panel).toBe(await kit.token(plain, "surface"));
      expect(off.borderStyle, panel).toBe("solid");
    }
  });

  test("a soft tag is filled; a coming-soon tag is only an outline", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const panel = kit.panel("Tag", "Light, English");
    const soft = kit.example(panel, "Soft").getByText("toddler food");
    const outline = kit.example(panel, "Outline").getByText("Coming soon");
    expect((await kit.drawn(soft)).background).toBe(
      await kit.token(soft, "accent-soft"),
    );
    const o = await kit.drawn(outline);
    expect(o.borderStyle).toBe("solid");
    expect(o.borderColour).toBe(await kit.token(outline, "border"));
  });

  test("a text box is easy to tap, and named by its label", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, Arabic"]) {
      const input = kit
        .example(kit.panel("Input", panel), "Empty")
        .getByRole("textbox");
      await expect(input).toHaveAccessibleName(/.+/);
      const drawn = await kit.drawn(input);
      expect(drawn.height, panel).toBeGreaterThanOrEqual(44);
      expect(drawn.borderColour, panel).toBe(await kit.token(input, "border"));
    }
  });
});

test.describe("The main button is easy to read", () => {
  test("its words are white, in light and dark", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const button = kit
        .example(kit.panel("Button", panel), "Main")
        .getByRole("button", { name: "Add a bill" });
      const [r = 0, g = 0, b = 0] = (
        String((await kit.drawn(button)).colour).match(/[\d.]+/g) ?? []
      ).map(Number);
      expect(Math.min(r, g, b), panel).toBeGreaterThanOrEqual(245);
    }
  });
});
