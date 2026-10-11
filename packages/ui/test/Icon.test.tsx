import { describe, expect, test } from "bun:test";
import { Icon } from "../src/index.js";
import { render } from "./render.js";

describe("Icon", () => {
  test("with a label, it's an image named by the label", () => {
    const svg = render(<Icon name="trash-2" label="Remove" />).querySelector(
      "svg",
    );
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Remove");
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
  });

  test("without one, screen readers skip it", () => {
    const svg = render(<Icon name="carrot" />).querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.hasAttribute("role")).toBe(false);
    expect(svg?.hasAttribute("aria-label")).toBe(false);
  });

  test("draws in the colour of its text", () => {
    const svg = render(<Icon name="check" />).querySelector("svg");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
  });

  test("never takes keyboard focus", () => {
    const svg = render(<Icon name="search" label="Search" />).querySelector(
      "svg",
    );
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.hasAttribute("tabindex")).toBe(false);
  });
});
