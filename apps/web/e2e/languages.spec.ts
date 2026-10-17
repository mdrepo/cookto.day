import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/65-onboarding.md, criterion 2.

test.describe("English to start, other languages coming soon", () => {
  test("English is chosen; Hindi, Marathi and Arabic can't be chosen yet", async ({
    page,
  }) => {
    const kitchen = new Kitchen(page);
    // In Settings, not on every page (#84).
    await kitchen.openSettings();
    await expect(page.getByRole("combobox")).toHaveValue("en");
    expect(await kitchen.languages()).toEqual([
      { name: "English", off: false },
      { name: "हिन्दी (coming soon)", off: true },
      { name: "मराठी (coming soon)", off: true },
      { name: "العربية (coming soon)", off: true },
    ]);
  });

  test("someone who chose another language before keeps English for now", async ({
    page,
  }) => {
    const kitchen = new Kitchen(page);
    await kitchen.savedLanguage("mr");
    await kitchen.open();
    await expect(kitchen.emptyState()).toContainText(
      "Choose what you cook, then add what's in your kitchen.",
    );
  });

  for (const [code, dir, words] of [
    ["hi", "ltr", "क्या पकाते हैं चुनें, फिर रसोई में जो है वह जोड़ें।"],
    ["mr", "ltr", "काय शिजवता ते निवडा, मग स्वयंपाकघरात जे आहे ते जोडा."],
    ["ar", "rtl", "اختر ما تطبخه، ثم أضف ما في مطبخك."],
  ] as const) {
    test(`a reviewer previews ${code} from the address`, async ({ page }) => {
      const kitchen = new Kitchen(page);
      await kitchen.open(code);
      await expect(kitchen.emptyState()).toContainText(words);
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
    });
  }
});
