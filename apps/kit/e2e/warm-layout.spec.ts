import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// #84: the prototype's layout, in DESIGN.md's colours. A light header, small
// section titles, and a warm card.

test.describe("The prototype's warm layout", () => {
  test("a page's header has no line under it, and its action sits at the title's end", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, actionAt] of [
      ["Light, English", "right"],
      ["Light, Arabic", "left"],
    ] as const) {
      const screen = kit.layout(
        kit.example(kit.panel("Screen", panel), "With an action"),
      );
      const header = screen.locator("header");
      expect(
        await header.evaluate((el) => getComputedStyle(el).borderBottomStyle),
        panel,
      ).toBe("none");
      const title = screen.getByRole("heading", { level: 1 });
      const action = header.getByRole("button");
      expect(await kit.leftOf(title, action), panel).toBe(actionAt === "right");
    }
  });

  test("a section's title is small and muted, and warm for food to use soon", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const panel = kit.panel("Section", "Light, English");
    const fresh = kit
      .example(panel, "A section")
      .getByRole("heading", { level: 2 });
    expect(await fresh.evaluate((el) => getComputedStyle(el).fontSize)).toBe(
      "14px",
    );
    expect((await kit.drawn(fresh)).colour).toBe(
      await kit.token(fresh, "text-muted"),
    );
    const soon = kit
      .example(panel, "Use soon")
      .getByRole("heading", { level: 2 });
    expect((await kit.drawn(soon)).colour).toBe(await kit.token(soon, "warn"));
  });

  test("a warm card is a soft aubergine fill with no border, its buttons inside", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const card = kit
        .example(kit.panel("Callout", panel), "Sample kitchen")
        .getByRole("region");
      const drawn = await kit.drawn(card);
      expect(drawn.background, panel).toBe(
        await kit.token(card, "accent-soft"),
      );
      expect(drawn.borderStyle, panel).toBe("none");
      expect(drawn.radius, panel).toBe("16px");
      await expect(card.getByRole("button"), panel).toHaveCount(2);
    }
  });
});
