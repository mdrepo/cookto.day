import { describe, expect, test } from "bun:test";
import { Steps } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criteria 1 and 3: "Step 1 of 2", in words, with a
// bar per step that screen readers skip.

describe("Steps", () => {
  test("says which step this is, in words", () => {
    const doc = render(<Steps current={1} total={2} label="Step 1 of 2" />);
    expect(doc.body.textContent).toBe("Step 1 of 2");
  });

  test("draws a bar per step, done up to this one, hidden from screen readers", () => {
    const doc = render(<Steps current={1} total={3} label="Step 1 of 3" />);
    const bars = doc.querySelector('[aria-hidden="true"]');
    expect(bars?.children.length).toBe(3);
    expect(
      [...(bars?.children ?? [])].map((b) => b.getAttribute("data-done")),
    ).toEqual(["true", "false", "false"]);
  });
});
