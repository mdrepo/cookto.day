import { describe, expect, test } from "bun:test";
import { Reasons } from "../src/index.js";
import { render } from "./render.js";

// specs/80-look.md, criterion 1: why a dish is picked, a dot before each
// reason. The dots are drawn, so screen readers hear only the words.

describe("Reasons", () => {
  test("is a list of reasons; the dots are hidden from screen readers", () => {
    const doc = render(
      <Reasons
        items={[
          { key: "uses", text: "Uses Spinach and Paneer", tone: "warm" },
          { key: "needs", text: "Needs: Onion", tone: "quiet" },
        ]}
      />,
    );
    const items = [...doc.querySelectorAll("ul > li")];
    expect(items.map((li) => li.textContent)).toEqual([
      "Uses Spinach and Paneer",
      "Needs: Onion",
    ]);
    for (const li of items)
      expect(li.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });
});
