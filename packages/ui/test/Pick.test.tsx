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

describe("Pick, opening its dish (#95)", () => {
  test("with onOpen, the dish is a button", () => {
    // Pressing it is in the e2e tests: this markup has no handlers.
    const doc = render(
      <Pick label="Lunch" dish="Palak paneer" onOpen={() => undefined} />,
    );
    const button = doc.querySelector("article button");
    expect(button?.textContent).toBe("Palak paneer");
    expect(button?.getAttribute("type")).toBe("button");
  });
});
