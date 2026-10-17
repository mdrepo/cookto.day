import { describe, expect, test } from "bun:test";
import { ItemList, Tag } from "../src/index.js";
import { render } from "./render.js";

// specs/80-look.md, criteria 4 and 5: the pantry as a short list; each row
// is one button that opens the item, read with its line and its tag.

describe("ItemList", () => {
  test("is a named list; each row is a button with the item's name, line and tag", () => {
    const doc = render(
      <ItemList
        label="Fresh"
        items={[
          {
            key: "s",
            name: "Spinach",
            line: "250 g · use within 3 days",
            end: <Tag tone="warn">Use soon</Tag>,
            onOpen: () => undefined,
          },
          { key: "o", name: "Onion", onOpen: () => undefined },
        ]}
      />,
    );
    expect(doc.querySelector("ul")?.getAttribute("aria-label")).toBe("Fresh");
    const rows = [...doc.querySelectorAll("ul > li > button")];
    expect(rows.map((b) => b.getAttribute("type"))).toEqual([
      "button",
      "button",
    ]);
    expect(rows[0]?.textContent).toBe(
      "Spinach250 g · use within 3 daysUse soon",
    );
    expect(rows[1]?.textContent).toBe("Onion");
  });

  test("a row can start with a picture, inside its button (#118)", () => {
    const doc = render(
      <ItemList
        label="Dishes"
        items={[
          {
            key: "p",
            name: "Palak paneer",
            media: <img src="palak.webp" alt="" />,
            onOpen: () => undefined,
          },
        ]}
      />,
    );
    const row = doc.querySelector("ul > li > button");
    expect(
      row?.firstElementChild?.querySelector("img")?.getAttribute("src"),
    ).toBe("palak.webp");
    expect(row?.textContent).toBe("Palak paneer");
  });
});
