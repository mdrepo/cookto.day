import { describe, expect, test } from "bun:test";
import { Rows } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criterion 4: "All set" lists each meal with who
// it's for. A list, so screen readers say how many there are.

describe("Rows", () => {
  test("is a list named by its label, an item per row", () => {
    const doc = render(
      <Rows
        label="Meals"
        rows={[
          { key: "b", label: "Breakfast", value: "Child" },
          {
            key: "e",
            label: "Evening snack",
            value: "Not planned",
            quiet: true,
          },
        ]}
      />,
    );
    const list = doc.querySelector("ul");
    expect(list?.getAttribute("aria-label")).toBe("Meals");
    const items = [...doc.querySelectorAll("li")];
    expect(
      items.map((li) => [...li.children].map((c) => c.textContent)),
    ).toEqual([
      ["Breakfast", "Child"],
      ["Evening snack", "Not planned"],
    ]);
  });
});
