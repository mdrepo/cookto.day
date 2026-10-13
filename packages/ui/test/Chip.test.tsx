import { describe, expect, test } from "bun:test";
import { Chip } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criterion 3: a meal chip ticks and unticks, and
// screen readers hear whether it's ticked.

const chip = (doc: Document) => doc.querySelector("button");

describe("Chip", () => {
  test("is a toggle button named by its words", () => {
    const doc = render(<Chip pressed={false}>Lunch</Chip>);
    expect(chip(doc)?.textContent).toBe("Lunch");
    expect(chip(doc)?.getAttribute("type")).toBe("button");
    expect(chip(doc)?.getAttribute("aria-pressed")).toBe("false");
  });

  test("a ticked chip says so, and shows a tick its words don't need", () => {
    const doc = render(<Chip pressed>Lunch</Chip>);
    expect(chip(doc)?.getAttribute("aria-pressed")).toBe("true");
    const tick = chip(doc)?.querySelector("svg");
    expect(tick).not.toBeNull();
    expect(tick?.getAttribute("aria-hidden")).toBe("true");
    expect(chip(doc)?.textContent).toBe("Lunch");
  });

  test("an unticked chip has no tick", () => {
    const doc = render(<Chip pressed={false}>Lunch</Chip>);
    expect(chip(doc)?.querySelector("svg")).toBeNull();
  });

  test("a disabled chip is the browser's disabled", () => {
    const doc = render(
      <Chip pressed={false} disabled>
        Lunch
      </Chip>,
    );
    expect(chip(doc)?.disabled).toBe(true);
  });
});
