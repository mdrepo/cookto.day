import { describe, expect, test } from "bun:test";
import { TabBar } from "../src/index.js";
import { render } from "./render.js";

// specs/80-look.md, criterion 3: a bar at the bottom between the kitchen's
// pages; the page you're on is marked as current.

describe("TabBar", () => {
  test("is a named navigation of buttons, the current one marked", () => {
    const doc = render(
      <TabBar
        label="Pages"
        tabs={[
          { key: "today", label: "Today", icon: "cooking-pot", current: true },
          { key: "pantry", label: "Pantry", icon: "refrigerator" },
        ]}
        onPick={() => undefined}
      />,
    );
    const nav = doc.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Pages");
    const buttons = [...doc.querySelectorAll("nav button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Today", "Pantry"]);
    expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual([
      "page",
      null,
    ]);
  });
});
