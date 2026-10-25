import { expect, test } from "./support/test.js";
import { swapDinner, tomorrow } from "./support/cook.js";
import {
  household,
  householdServer,
  tomorrowDinner,
} from "./support/household.js";
import { mayur } from "./support/schedule.js";

// specs/270-the-bot-talks-like-a-person.md, criteria 17 and 18: who's out,
// set from the chat, counts on the phone; and once the plan went to a cook
// on Telegram, a change reaches her by itself, so Tomorrow says so and
// offers no "Send again". The API faked in the page (ADR 0025).

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

  test("counts on the phone", async ({ page }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    await m.k.home();
    // Priya eats dinner too; then she's out for tomorrow's, from the chat.
    const record = { version: 1, updatedAt: "2026-10-19T12:00:00.000Z" };
    s.put("members", {
      ...record,
      id: "m-priya",
      deletedAt: null,
      kind: "adult",
      nickname: "Priya",
      meals: ["lunch", "dinner"],
    });
    const dinner = tomorrowDinner(page);
    await expect(dinner).toContainText("For 2 people", { timeout: 10_000 });
    s.put("eating", {
      ...record,
      id: "eating:2026-10-20:dinner",
      deletedAt: null,
      on: "2026-10-20",
      slot: "dinner",
      out: ["m-priya"],
      guests: 0,
    });
    await expect(dinner).toContainText("For 1 person", { timeout: 10_000 });
  });
});
