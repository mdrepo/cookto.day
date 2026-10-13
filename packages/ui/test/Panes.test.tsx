import { describe, expect, test } from "bun:test";
import { Panes } from "../src/index.js";
import { render } from "./render.js";

// Wide screens: two panes side by side; phones: one above the other.

describe("Panes", () => {
  test("holds the side pane first, so a phone reads it first", () => {
    const doc = render(
      <Panes primary={<p>Cook today</p>} secondary={<p>Use soon</p>} />,
    );
    expect([...doc.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "Use soon",
      "Cook today",
    ]);
  });
});
