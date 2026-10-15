import { describe, expect, test } from "bun:test";
import { UndoBar } from "../src/index.js";
import { render } from "./render.js";

describe("UndoBar", () => {
  test("says what happened, so screen readers hear it, with a way back", () => {
    const doc = render(
      <UndoBar undoLabel="Undo" onUndo={() => undefined}>
        Onion used up
      </UndoBar>,
    );
    const status = doc.querySelector("[role='status']");
    expect(status?.textContent).toContain("Onion used up");
    expect(status?.querySelector("button")?.textContent).toBe("Undo");
  });
});
