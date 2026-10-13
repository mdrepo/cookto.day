import { describe, expect, test } from "bun:test";
import { Pick } from "../src/index.js";
import { render } from "./render.js";

// specs/80-look.md, criterion 1: one pick per meal, in large words, named by
// its meal for screen readers.

describe("Pick", () => {
  test("is an article named by its meal, the dish and what it's served with inside", () => {
    const doc = render(
      <Pick label="Lunch" dish="Palak paneer" note="with Roti or Rice">
        <p>why</p>
      </Pick>,
    );
    const card = doc.querySelector("article");
    const heading = doc.getElementById(
      card?.getAttribute("aria-labelledby") ?? "",
    );
    expect(heading?.tagName).toBe("H3");
    expect(heading?.textContent).toBe("Lunch");
    expect(card?.textContent).toContain("Palak paneer");
    expect(card?.textContent).toContain("with Roti or Rice");
    expect(card?.textContent).toContain("why");
  });
});
