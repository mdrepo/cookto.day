import { expect, test } from "@playwright/test";
import { Kit } from "./support/kit.js";

// specs/175-more.md: a row of My dishes with "Take out" at its end, in the
// row, at least 44px tall, at the end in both directions.

test("a row's action sits at its end, in the row", async ({ page }) => {
  const kit = new Kit(page);
  await kit.open();
  for (const [panel, name, take, right] of [
    ["Light, English", "Spinach", "Take out", true],
    ["Light, Arabic", "سبانخ", "أخرِج", false],
  ] as const) {
    const list = kit.example(kit.panel("ItemList", panel), "With an action");
    const row = list.getByRole("button", { name: new RegExp(`^${name}`) });
    const action = list.getByRole("button", { name: `${take} ${name}` });
    expect(Number((await kit.drawn(action)).height)).toBeGreaterThanOrEqual(44);
    expect(await kit.leftOf(row, action), panel).toBe(right);
    await expect(action).toHaveText(take);
  }
});
