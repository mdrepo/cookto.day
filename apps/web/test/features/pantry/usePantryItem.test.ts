import { describe, expect, test } from "bun:test";
import { renderCount } from "@cookto/testing";
import { addFood, changeAmount, useUp } from "@cookto/usecases";
import { act } from "react";
import { usePantryItem } from "../../../src/features/pantry/usePantryItem.js";
import { kitchen, pantry } from "../../../src/platform.js";

// specs/72-kitchen.md, criterion 11: changing one item redraws only its row
// (ADR 0023). The app's own repositories, in memory here.

/** Lets reads and refreshes finish, inside React's act. */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });

async function emptyPantry() {
  for (const item of await pantry.reader.items()) await useUp(kitchen, item.id);
}

describe("usePantryItem", () => {
  test("changing the spinach's amount redraws the spinach, not the onions", async () => {
    await emptyPantry();
    const food = (name: string, amount: number) =>
      addFood(
        kitchen,
        { name, amount, unit: "g", boughtOn: "2026-10-13" },
        "en",
      );
    await food("Spinach", 250);
    await food("Onions", 1000);
    const [spinach, onions] = await pantry.reader.items();
    const spinachRow = renderCount(() => usePantryItem(spinach?.id ?? ""));
    const onionRow = renderCount(() => usePantryItem(onions?.id ?? ""));
    try {
      await settle();
      expect(spinachRow.value()?.name).toBe("Spinach");
      const spinachBefore = spinachRow.renders();
      const onionsBefore = onionRow.renders();

      await act(async () => {
        await changeAmount(kitchen, spinach?.id ?? "", 100, "g");
      });
      await settle();
      expect(spinachRow.renders()).toBe(spinachBefore + 1);
      expect(spinachRow.value()?.amount).toBe("100 g");
      expect(onionRow.renders()).toBe(onionsBefore);
    } finally {
      // The last mounted first: each puts back the globals it found.
      onionRow.unmount();
      spinachRow.unmount();
    }
  });
});
