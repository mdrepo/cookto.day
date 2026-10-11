import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/17-kit.md, criterion 3. Measured on the page as it was before it was
// built from the kit's parts, so a rebuild can't quietly change the look.

const BEFORE = {
  titleSize: "28px",
  titleWeight: "700",
  labelSize: "14px",
  labelColour: "text-muted",
  labelBesideSelect: "yes",
  selectHeight: 44,
  selectRadius: "8px",
  selectBorder: "solid border",
  selectBackground: "surface",
  emptyBorder: "dashed border",
  emptyRadius: "16px",
  emptyPadding: "32px 16px",
  emptyBackground: "surface",
  emptyAlign: "center",
  emptyTitleSize: "20px",
  emptyTitleWeight: "600",
  emptyBodyColour: "text-muted",
  emptyBodyGap: 8,
  noteSize: "14px",
  noteColour: "text-muted",
  noteAlign: "center",
  noteGap: 16,
};

test.describe("Today's page is built from the kit", () => {
  test("today's page is the same after the rebuild", async ({ page }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();
    expect(await kitchen.look()).toEqual(BEFORE);

    await kitchen.chooseLanguage("العربية");
    expect(await kitchen.look()).toEqual(BEFORE);
  });
});
