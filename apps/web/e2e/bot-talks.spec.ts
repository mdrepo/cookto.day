import { expect, test } from "./support/test.js";
import { swapDinner, tomorrow } from "./support/cook.js";
import { household, householdServer } from "./support/household.js";
import { mayur } from "./support/schedule.js";

// specs/270-the-bot-talks-like-a-person.md, criterion 18: once the plan went
// to a cook on Telegram, a change reaches her by itself, so Tomorrow says so
// and offers no "Send again". The API faked in the page (ADR 0025).

test.describe("The bot talks like a person", () => {
  test("Tomorrow after a change", async ({ page }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    s.members.push({
      id: "m-sunita",
      role: "cook",
      kind: "telegram",
      name: "Sunita",
      stopped: false,
      account: null,
    });
    // Settings again: the phone takes in the household's cook.
    await m.k.home();
    await m.k.settings();
    await expect(
      household(page).getByText("The cook, on Telegram"),
    ).toBeVisible();
    await m.k.home();
    const tm = tomorrow(page);
    await tm.getByRole("button", { name: "Looks good" }).click();
    await expect(tm).toContainText("Sent to the cook, 7:00 pm");
    await tm.getByRole("button", { name: "Change" }).click();
    await swapDinner(m.k, page);
    await expect(tm).toContainText("Sunita will get the change.");
    await expect(tm.getByRole("button", { name: "Send again" })).toHaveCount(0);
  });
});
