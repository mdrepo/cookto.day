import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/65-onboarding.md: a person's card, with remove beside the name, and
// "Where do you live?" said once on screen, while its cards stay named by it.

test.describe("A card's action, and a choice's hidden question", () => {
  test("a card's action sits on its title's line, at its end", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, ltr] of [
      ["Light, English", true],
      ["Light, Arabic", false],
    ] as const) {
      const example = kit.example(kit.panel("Card", panel), "With an action");
      const title = example.getByRole("heading");
      const action = example.getByRole("button");
      const [t, a] = [await title.boundingBox(), await action.boundingBox()];
      if (!t || !a) throw new Error("not drawn");
      expect(
        Math.abs(t.y + t.height / 2 - (a.y + a.height / 2)),
        panel,
      ).toBeLessThan(4);
      expect(await kit.leftOf(title, action), panel).toBe(ltr);
    }
  });

  test("a choice's hidden question still names its cards", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("Choice", "Light, English"),
      "Question hidden",
    );
    await expect(
      example.getByRole("group", { name: "Where do you live?" }),
    ).toBeVisible();
    const legend = await example.locator("legend").boundingBox();
    expect(legend?.height ?? 0).toBeLessThanOrEqual(1);
  });
});
