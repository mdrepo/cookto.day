import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/33-layouts.md, criteria 1 to 3. Every test runs on a phone and a
// desktop (the two Playwright projects).

test.describe("Parts sit together the same way on every screen", () => {
  test("parts in a stack are spaced by the spacing steps only", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    const panel = kit.panel("Stack", "Light, English");
    for (const [example, gap] of [
      ["Gap 2", 8],
      ["Gap 6", 24],
    ] as const) {
      const parts = kit
        .layout(kit.example(panel, example))
        .locator(":scope > *");
      const boxes = await kit.boxes(parts);
      expect(boxes.length, example).toBe(3);
      for (let i = 1; i < boxes.length; i++) {
        const [above, below] = [boxes[i - 1], boxes[i]];
        expect(below?.x, example).toBe(above?.x);
        expect((below?.y ?? 0) - (above?.bottom ?? 0), example).toBe(gap);
      }
    }
  });

  test("a cluster wraps on a narrow phone, and starts from the right in Arabic", async ({
    page,
  }) => {
    const kit = new Kit(page);
    await kit.open();
    for (const [panelName, startsAt] of [
      ["Light, English", "left"],
      ["Light, Arabic", "right"],
    ] as const) {
      const panel = kit.panel("Cluster", panelName);
      const cluster = kit.layout(kit.example(panel, "Wrapping"));
      const [box] = await kit.boxes(cluster);
      const buttons = await kit.boxes(cluster.getByRole("button"));
      expect(buttons.length, panelName).toBe(5);
      expect(new Set(buttons.map((b) => b.y)).size, panelName).toBeGreaterThan(
        1,
      );
      for (const b of buttons) {
        expect(b.x, panelName).toBeGreaterThanOrEqual(box?.x ?? 0);
        expect(b.right, panelName).toBeLessThanOrEqual(box?.right ?? 0);
      }
      const first = buttons[0];
      const firstRow = buttons.filter((b) => b.y === first?.y);
      if (startsAt === "left")
        expect(first?.x, panelName).toBe(Math.min(...firstRow.map((b) => b.x)));
      else
        expect(first?.right, panelName).toBe(
          Math.max(...firstRow.map((b) => b.right)),
        );
    }
  });

  test("a screen is one centred column", async ({ page }) => {
    const kit = new Kit(page);
    await kit.open();
    const screen = kit.layout(
      kit.example(kit.panel("Screen", "Light, English"), "A page"),
    );
    const main = screen.getByRole("main");
    const [outer] = await kit.boxes(screen);
    const [column] = await kit.boxes(main);
    const [content] = await kit.boxes(main.locator(":scope > *").first());
    if (!outer || !column || !content) throw new Error("no screen to measure");

    // 40rem, or 64rem on a wide screen (840px and up): the same on every page.
    const width = column.right - column.x;
    if (outer.right - outer.x >= 840) {
      expect(width).toBeGreaterThan(640);
      expect(width).toBeLessThanOrEqual(1024);
    } else expect(width).toBeLessThanOrEqual(640);
    expect(
      Math.abs(column.x - outer.x - (outer.right - column.right)),
    ).toBeLessThanOrEqual(1);
    if (kit.onPhone()) expect(content.x - outer.x).toBe(16);
    else expect(outer.right - outer.x).toBeGreaterThan(640);
  });
});
