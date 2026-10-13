import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/65-onboarding.md, criterion 4: each meal, with who it's for.

test.describe("Rows: a label and its value", () => {
  test("rows sit on the surface, a value at the end, a quiet one muted", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, ltr] of [
      ["Light, English", true],
      ["Dark, English", true],
      ["Light, Arabic", false],
    ] as const) {
      const example = kit.example(kit.panel("Rows", panel), "Meals");
      const list = example.getByRole("list");
      const box = await kit.drawn(list);
      expect(box.background, panel).toBe(await kit.token(list, "surface"));
      expect(box.borderStyle, panel).toBe("solid");

      const items = example.getByRole("listitem");
      await expect(items).toHaveCount(3);
      const [label, value] = [
        items.first().locator("> *").first(),
        items.first().locator("> *").last(),
      ];
      expect(await kit.leftOf(label, value), panel).toBe(ltr);
      expect((await kit.drawn(value)).colour, panel).toBe(
        await kit.token(value, "text"),
      );
      const quiet = items.last().locator("> *").last();
      expect((await kit.drawn(quiet)).colour, panel).toBe(
        await kit.token(quiet, "text-muted"),
      );
    }
  });
});
