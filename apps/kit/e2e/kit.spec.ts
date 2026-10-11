import { expect, test } from "@playwright/test";
import { Kit, PANELS } from "./support/kit.js";

// specs/17-kit.md

const PARTS = ["Field", "Select", "EmptyState", "Note"];

test.describe("Every part of the design is on one page", () => {
  test("the kit shows every part in light and dark, English and Arabic", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();

    for (const part of PARTS) {
      await expect(kit.part(part)).toBeVisible();
      expect(await kit.panelNames(part), part).toEqual([...PANELS]);
      for (const name of PANELS) {
        const panel = kit.panel(part, name);
        const lightness = await kit.lightness(panel);
        if (name.startsWith("Dark")) expect(lightness, name).toBeLessThan(0.2);
        else expect(lightness, name).toBeGreaterThan(0.8);
        expect(await kit.direction(panel), name).toBe(
          name.endsWith("Arabic") ? "rtl" : "ltr",
        );
      }
    }
  });

  test("the kit shows every state of a part", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const panel = kit.panel("Select", "Light, English");

    const normal = kit.example(panel, "Normal").getByRole("combobox");
    await expect(normal).toBeEnabled();

    const disabled = kit.example(panel, "Disabled").getByRole("combobox");
    await expect(disabled).toBeDisabled();

    const withProblem = kit.example(panel, "With a problem");
    const select = withProblem.getByRole("combobox", { name: "Language" });
    await expect(select).toHaveAccessibleDescription("Choose a language");
    const problem = withProblem.getByText("Choose a language");
    const { colour, warn } = await kit.colours(problem);
    expect(colour).toBe(warn);
    const [selectBox, problemBox] = await Promise.all([
      select.boundingBox(),
      problem.boundingBox(),
    ]);
    expect(problemBox?.y).toBeGreaterThanOrEqual(
      (selectBox?.y ?? 0) + (selectBox?.height ?? 0),
    );
  });
});
