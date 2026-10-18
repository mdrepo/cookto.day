import { describe, expect, test } from "bun:test";
import { renderCount } from "@cookto/testing";
import { useMoreScreen } from "../../../src/features/more/useMoreScreen.js";

// specs/175-more.md, criterion 1: More has Packs and Settings, drawn once.
describe("useMoreScreen", () => {
  test("gives More its title and two rows, Packs and Settings", () => {
    const hook = renderCount(() => useMoreScreen());
    try {
      expect(hook.renders()).toBe(1);
      const s = hook.value();
      expect(s.title).toBe("More");
      // Where each row goes is the e2e test's (e2e/more.spec.ts).
      expect(s.rows.map((r) => r.name)).toEqual(["Packs", "Settings"]);
    } finally {
      hook.unmount();
    }
  });
});
