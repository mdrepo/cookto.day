import { describe, expect, test } from "bun:test";
import { openPage } from "../helpers/page.js";

// specs/65-onboarding.md, criterion 2: English to start; Hindi, Marathi and
// Arabic are coming soon, and reviewers see them with ?preview-language=.

describe("language switch", () => {
  test.each([
    ["en", "ltr", "Choose what you cook, then add what's in your kitchen."],
    ["hi", "ltr", "क्या पकाते हैं चुनें, फिर रसोई में जो है वह जोड़ें।"],
    ["mr", "ltr", "काय शिजवता ते निवडा, मग स्वयंपाकघरात जे आहे ते जोडा."],
    ["ar", "rtl", "اختر ما تطبخه، ثم أضف ما في مطبخك."],
  ])(
    "previewing %p sets lang, direction %p and the words",
    (code, dir, body) => {
      const page = openPage({ search: `?preview-language=${code}` });
      expect(page.doc.documentElement.lang).toBe(code);
      expect(page.doc.documentElement.dir).toBe(dir);
      expect(page.emptyState().body).toBe(body);
    },
  );

  test("English is chosen; the other languages are coming soon", () => {
    // The language list is in Settings since #84.
    const page = openPage({ hash: "#/settings" });
    expect(page.text("h1")).toBe("Settings");
    expect(page.languages()).toEqual([
      { code: "en", text: "English", off: false },
      { code: "hi", text: "हिन्दी (coming soon)", off: true },
      { code: "mr", text: "मराठी (coming soon)", off: true },
      { code: "ar", text: "العربية (coming soon)", off: true },
    ]);
    expect(page.doc.documentElement.lang).toBe("en");
  });

  test("a coming-soon language can't be chosen", () => {
    const page = openPage({ hash: "#/settings" });
    expect(page.text("h1")).toBe("Settings");
    page.chooseLanguage("mr");
    expect(page.doc.documentElement.lang).toBe("en");
    expect(page.storage.getItem("cookto.day:language")).toBeNull();
  });

  test("someone who chose Marathi before keeps English for now", () => {
    const page = openPage({ storage: { "cookto.day:language": "mr" } });
    expect(page.doc.documentElement.lang).toBe("en");
    // Still saved, for when Marathi is turned on.
    expect(page.storage.getItem("cookto.day:language")).toBe("mr");
  });

  test("an unknown saved language falls back to English", () => {
    const page = openPage({ storage: { "cookto.day:language": "xx" } });
    expect(page.doc.documentElement.lang).toBe("en");
  });
});
