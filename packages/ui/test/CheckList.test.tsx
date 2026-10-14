import { describe, expect, test } from "bun:test";
import { CheckList } from "../src/index.js";
import { render } from "./render.js";

// A list to tick off, like the shopping list (specs/103): each row is a
// checkbox named by its words, as big as a tap target.
describe("CheckList", () => {
  test("is a named list of checkboxes, each named by its words", () => {
    const doc = render(
      <CheckList
        label="Shopping list"
        items={[
          { key: "a", label: "Onion", onCheck: () => undefined },
          { key: "b", label: "Cream", onCheck: () => undefined },
        ]}
      />,
    );
    const list = doc.querySelector("ul");
    expect(list?.getAttribute("aria-label")).toBe("Shopping list");
    const boxes = [...doc.querySelectorAll("li label")].map((l) => [
      l.querySelector("input")?.getAttribute("type"),
      l.textContent,
    ]);
    expect(boxes).toEqual([
      ["checkbox", "Onion"],
      ["checkbox", "Cream"],
    ]);
  });
});
