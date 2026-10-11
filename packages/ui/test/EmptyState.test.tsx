import { describe, expect, test } from "bun:test";
import { EmptyState } from "../src/index.js";
import { render, textOf } from "./render.js";

describe("EmptyState", () => {
  test("is a region named by its title, saying what to do next", () => {
    const doc = render(
      <EmptyState title="Your kitchen is empty">
        Add a grocery bill to see what you can cook today
      </EmptyState>,
    );
    const region = doc.querySelector("section");
    expect(textOf(doc, region?.getAttribute("aria-labelledby") ?? null)).toBe(
      "Your kitchen is empty",
    );
    expect(region?.querySelector("h2")?.textContent).toBe(
      "Your kitchen is empty",
    );
    expect(region?.querySelector("p")?.textContent).toBe(
      "Add a grocery bill to see what you can cook today",
    );
  });
});
