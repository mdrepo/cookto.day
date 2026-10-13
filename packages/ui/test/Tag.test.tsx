import { describe, expect, test } from "bun:test";
import { Tag } from "../src/index.js";
import { render } from "./render.js";

// specs/65-onboarding.md, criteria 1 and 3: a small label beside something,
// like "toddler food" or "Coming soon". Its two tones are drawn by CSS, so
// the kit page's e2e test checks them.

describe("Tag", () => {
  test("is its words, read with what it labels", () => {
    const tag = render(<Tag>toddler food</Tag>).body.firstElementChild;
    expect(tag?.tagName).toBe("SPAN");
    expect(tag?.textContent).toBe("toddler food");
  });
});
