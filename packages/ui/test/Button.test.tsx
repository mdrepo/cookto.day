import { describe, expect, test } from "bun:test";
import { Button } from "../src/index.js";
import { render } from "./render.js";

const button = (doc: Document) => doc.querySelector("button");

describe("Button", () => {
  test("is the browser's own button, and never submits a form by accident", () => {
    const doc = render(<Button>Save</Button>);
    expect(button(doc)?.textContent).toBe("Save");
    expect(button(doc)?.getAttribute("type")).toBe("button");
  });

  test("a busy button is still reachable, but says it's busy and can't be used", () => {
    const doc = render(<Button busy>Saving</Button>);
    expect(button(doc)?.getAttribute("aria-busy")).toBe("true");
    expect(button(doc)?.getAttribute("aria-disabled")).toBe("true");
    expect(button(doc)?.disabled).toBe(false);
    expect(
      button(doc)?.querySelector('[data-testid="busy"] svg'),
    ).not.toBeNull();
  });

  test("a disabled button is the browser's disabled", () => {
    expect(button(render(<Button disabled>Save</Button>))?.disabled).toBe(true);
  });

  test("an icon-only button is named by its label, and its icon is hidden", () => {
    const doc = render(<Button icon="trash-2" label="Remove" />);
    expect(button(doc)?.getAttribute("aria-label")).toBe("Remove");
    expect(button(doc)?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  test("an icon beside words is decoration", () => {
    const doc = render(<Button icon="plus">Add a bill</Button>);
    expect(button(doc)?.hasAttribute("aria-label")).toBe(false);
    expect(button(doc)?.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
