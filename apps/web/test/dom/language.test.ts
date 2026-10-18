import { describe, expect, test } from "bun:test";
import { openPage } from "../helpers/page.js";

// specs/65-onboarding.md, criterion 2: English to start; Hindi, Marathi and
// Arabic are coming soon, and reviewers see them with ?preview-language=.

describe("language switch", () => {
  // Hindi, Marathi and Arabic load after the first page (ADR 0013), which
  // this one-file build can't do: e2e/languages.spec.ts previews them.
  test.each([
    ["en", "ltr", "Choose what you cook, then add what's in your kitchen."],
  ])(
    "previewing %p sets lang, direction %p and the words",
    (code, dir, body) => {
      const page = openPage({ search: `?preview-language=${code}` });
      expect(page.doc.documentElement.lang).toBe(code);
      expect(page.doc.documentElement.dir).toBe(dir);
      expect(page.emptyState().body).toBe(body);
    },
  );

  // The language list is in Settings (#84), which loads after the first
  // page since it moved under More (specs/175): e2e/languages.spec.ts shows
  // English chosen and the coming-soon languages switched off.

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
