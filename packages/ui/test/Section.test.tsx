import { describe, expect, test } from "bun:test";
import { Section } from "../src/index.js";
import { render } from "./render.js";

// #84, criterion 2: a section's title is small, just above what it names.

describe("Section", () => {
  test("is a region named by its title, with what it names under it", () => {
    const doc = render(
      <Section title="Fresh">
        <ul>
          <li>Spinach</li>
        </ul>
      </Section>,
    );
    const section = doc.querySelector("section");
    const title = doc.getElementById(
      section?.getAttribute("aria-labelledby") ?? "",
    );
    expect(title?.tagName).toBe("H2");
    expect(title?.textContent).toBe("Fresh");
    expect(section?.querySelector("li")?.textContent).toBe("Spinach");
  });
});
