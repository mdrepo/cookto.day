import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/18-icons.md

test.describe("Icons look the same everywhere and are read out when they mean something", () => {
  test("an icon that means something is read out", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, name] of [
      ["Light, English", "Remove"],
      ["Light, Arabic", "إزالة"],
    ] as const) {
      const example = kit.example(kit.panel("Icon", panel), "With a label");
      await expect(
        example.getByRole("img", { name, exact: true }),
      ).toBeVisible();
    }
  });

  test("a decorative icon is skipped by screen readers", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("Icon", "Light, English"),
      "Beside words",
    );
    await expect(example.locator("svg")).toHaveCount(1);
    await expect(example.getByRole("img")).toHaveCount(0);
    await expect(example).toHaveAccessibleName("Beside words");
    await expect(example.getByText("Carrots")).toBeVisible();
  });

  test("arrows turn round in Arabic, other icons don't", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const icon = (panel: string, example: string) =>
      kit.example(kit.panel("Icon", panel), example).locator("svg");

    expect(await kit.mirrored(icon("Light, English", "Back"))).toBe(false);
    expect(await kit.mirrored(icon("Light, Arabic", "Back"))).toBe(true);
    expect(await kit.mirrored(icon("Light, English", "Beside words"))).toBe(
      false,
    );
    expect(await kit.mirrored(icon("Light, Arabic", "Beside words"))).toBe(
      false,
    );
  });

  test("icons take the colour of their text, in light and dark", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const colours: string[] = [];
      for (const example of ["In text", "In muted text"]) {
        const svg = kit
          .example(kit.panel("Icon", panel), example)
          .locator("svg");
        const { stroke, text } = await kit.strokeAndText(svg);
        expect(stroke, `${panel}, ${example}`).toBe(text);
        colours.push(stroke);
      }
      expect(colours[0], panel).not.toBe(colours[1]);
    }
  });

  test("three sizes, from the tokens", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const icons = kit
      .example(kit.panel("Icon", "Light, English"), "Sizes")
      .locator("svg");
    const sizes = await icons.evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return [box.width, box.height];
      }),
    );
    expect(sizes).toEqual([
      [16, 16],
      [20, 20],
      [24, 24],
    ]);
  });
});
