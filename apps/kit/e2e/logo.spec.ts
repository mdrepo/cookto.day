import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// The pot, the app's logo, in a warm card, as the prototype draws it.

test.describe("The logo", () => {
  test("loads in a warm card, before the title, on a light backing in dark", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, logoAt] of [
      ["Light, English", "left"],
      ["Light, Arabic", "right"],
      ["Dark, English", "left"],
    ] as const) {
      const card = kit
        .example(kit.panel("Callout", panel), "With the logo")
        .getByRole("region");
      const logo = card.locator("img");
      expect(
        await logo.evaluate((img: HTMLImageElement) => img.naturalWidth),
        panel,
      ).toBeGreaterThan(0);
      const title = card.getByRole("heading", { level: 2 });
      expect(await kit.leftOf(logo, title), panel).toBe(logoAt === "left");
      if (panel.startsWith("Dark"))
        expect((await kit.drawn(logo)).background, panel).toBe(
          await kit.token(logo, "text"),
        );
    }
  });
});
