import { describe, expect, test } from "bun:test";
import { Sheet } from "../src/index.js";
import { render } from "./render.js";

// specs/80-look.md, criterion 5: one item's controls in a sheet, a dialog
// named by its title, with a way to close it.

describe("Sheet", () => {
  test("is a dialog named by its title, with a Close button", () => {
    const doc = render(
      <Sheet
        open={false}
        title="Spinach"
        closeLabel="Close"
        onClose={() => undefined}
      >
        <p>controls</p>
      </Sheet>,
    );
    const dialog = doc.querySelector("dialog");
    const title = doc.getElementById(
      dialog?.getAttribute("aria-labelledby") ?? "",
    );
    expect(title?.textContent).toBe("Spinach");
    expect(dialog?.querySelector('button[aria-label="Close"]')).not.toBeNull();
    expect(dialog?.textContent).toContain("controls");
  });
});
