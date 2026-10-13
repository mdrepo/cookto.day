import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/80-look.md: the parts Today and the pantry are built from, as the
// prototype draws them, in DESIGN.md's colours.

const fontSize = (el: import("@playwright/test").Locator) =>
  el.evaluate((node) => getComputedStyle(node).fontSize);

test.describe("Today's parts", () => {
  test("a pick shows its dish in large words, on the surface", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const example = kit.example(
      kit.panel("Pick", "Light, English"),
      "A meal's pick",
    );
    const card = example.getByRole("article", { name: "Lunch" });
    const dish = card.getByText("Palak paneer", { exact: true });
    expect(await fontSize(dish)).toBe("28px");
    expect((await kit.drawn(card)).background).toBe(
      await kit.token(card, "surface"),
    );
  });

  test("a reason's dot is warm for food that needs using, aubergine for good news", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const panel of ["Light, English", "Dark, English"]) {
      const list = kit.example(
        kit.panel("Reasons", panel),
        "Warm, good and quiet",
      );
      const dots = list.locator('li > [aria-hidden="true"]');
      expect((await kit.drawn(dots.nth(0))).background, panel).toBe(
        await kit.token(dots.nth(0), "warn"),
      );
      expect((await kit.drawn(dots.nth(1))).background, panel).toBe(
        await kit.token(dots.nth(1), "accent"),
      );
    }
  });

  test("the bar's current page is aubergine; every page is 44px; it starts from the right in Arabic", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, first, second, leftFirst] of [
      ["Light, English", "Today", "Pantry", true],
      ["Light, Arabic", "اليوم", "المخزن", false],
    ] as const) {
      const bar = kit.example(kit.panel("TabBar", panel), "Today is current");
      const current = bar.getByRole("button", { name: first });
      await expect(current).toHaveAttribute("aria-current", "page");
      expect((await kit.drawn(current)).colour, panel).toBe(
        await kit.token(current, "accent"),
      );
      for (const button of await bar.getByRole("button").all())
        expect(Number((await kit.drawn(button)).height)).toBeGreaterThanOrEqual(
          44,
        );
      const other = bar.getByRole("button", { name: second });
      expect(await kit.leftOf(current, other), panel).toBe(leftFirst);
    }
  });

  test("a list row is one 44px button, its tag at the end", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panel, name, tag, tagRight] of [
      ["Light, English", "Spinach", "Use soon", true],
      ["Light, Arabic", "سبانخ", "استخدمه قريبًا", false],
    ] as const) {
      const list = kit.example(kit.panel("ItemList", panel), "Fresh food");
      const row = list.getByRole("button", { name: new RegExp(`^${name}`) });
      expect(Number((await kit.drawn(row)).height)).toBeGreaterThanOrEqual(44);
      expect(
        await kit.leftOf(
          row.getByText(name, { exact: true }),
          row.getByText(tag),
        ),
        panel,
      ).toBe(tagRight);
    }
  });

  test("a sheet sits on the surface with large top corners, named by its title", async ({
    page,
  }) => {
    // The kit page runs no script: opening, Escape and focus are checked on
    // the pantry (apps/web/e2e/look.spec.ts).
    const kit = new Kit(page);
    await kit.open();
    const sheet = kit
      .example(kit.panel("Sheet", "Light, English"), "Open")
      .getByRole("dialog", { name: "Spinach" });
    await expect(sheet).toBeVisible();
    const drawn = await kit.drawn(sheet);
    expect(drawn.background).toBe(await kit.token(sheet, "surface"));
    expect(drawn.radius).toBe("16px");
    await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
  });
});
