import { expect, test } from "@playwright/test";
import { Kitchen } from "./support/kitchen.js";

// specs/65-onboarding.md, criterion 2.

test.describe("English to start, other languages coming soon", () => {
  test("English is chosen; Hindi, Marathi and Arabic can't be chosen yet", async ({
    page,
  }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open();
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
      "Add a grocery bill to see what you can cook today",
    );
  });

  test("a reviewer previews a coming-soon language from the address", async ({
    page,
  }) => {
    const kitchen = new Kitchen(page);
    await kitchen.open("hi");
    await expect(kitchen.emptyState()).toContainText(
      "आज क्या पका सकते हैं, यह देखने के लिए किराने का बिल जोड़ें",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });
});
