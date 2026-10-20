import { expect, type Page, test } from "@playwright/test";
import { evening, swapDinner, planner } from "./support/cook.js";
import {
  fakeHouseholdApi,
  household,
  householdServer,
  type HouseholdServer,
  signIn,
  tomorrowDinner,
} from "./support/household.js";

// specs/217-households.md, criteria 4, 5, 7 and 8: a second phone sees the
// plan; newest wins; offline nothing waits; leave, and remove the cook. One
// server in the test, two phones as two browser contexts.

/** Mayur's phone, signed in with the household started from its evening. */
async function mayur(page: Page, s: HouseholdServer) {
  const api = await fakeHouseholdApi(page, s);
  await planner(page);
  const k = await evening(page);
  await k.settings();
  await signIn(page, s, "Mayur");
  await expect(household(page).getByText("Mayur, plans")).toBeVisible();
  await k.home();
  return { k, api };
}

/** Priya's phone, a member already, signed in and showing the household. */
async function priya(page: Page, s: HouseholdServer) {
  const api = await fakeHouseholdApi(page, s);
  s.inHousehold.add("Priya");
  s.members.push({
    id: "m-priya",
    role: "plan",
    kind: "account",
    name: "Priya",
    stopped: false,
    account: "Priya",
  });
  await planner(page);
  const k = await evening(page);
  await k.settings();
  await signIn(page, s, "Priya");
  await k.press("Replace");
  await expect(household(page).getByText("Priya, plans")).toBeVisible();
  await k.home();
  return { k, api };
}

test.describe("One plan on every phone", () => {
  // Two phones, each signed in through the bot: slower than one.
  test.slow();
  test("a second phone sees the plan", async ({ page, browser }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    const dish = await swapDinner(m.k, page);
    await expect
      .poll(() => s.recordsOf("plans").some((r) => r.dish !== undefined), {
        timeout: 10_000,
      })
      .toBe(true);

    const second = await browser.newContext();
    const other = await second.newPage();
    await priya(other, s);
    await expect(tomorrowDinner(other)).toContainText(dish, {
      timeout: 10_000,
    });
    await second.close();
  });

  test("newest wins", async ({ page, browser }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    const second = await browser.newContext();
    const other = await second.newPage();
    const p = await priya(other, s);

    m.api.down = true;
    p.api.down = true;
    await swapDinner(m.k, page);
    await swapDinner(p.k, other);
    // The ideas stay open after a swap: her second pick comes from the list.
    const idea = tomorrowDinner(other)
      .getByRole("list", { name: "Other ideas" })
      .getByRole("button")
      .first();
    const theirs = await p.k.nameOf(idea);
    await idea.click();

    m.api.down = false;
    p.api.down = false;
    // Both phones come back online: each pushes, then pulls.
    const online = (on: Page) =>
      on.evaluate(() => {
        window.dispatchEvent(new Event("online"));
      });
    await online(page);
    await expect
      .poll(() => s.recordsOf("plans").some((r) => r.version === 2), {
        timeout: 10_000,
      })
      .toBe(true);
    await online(other);
    await expect(tomorrowDinner(other)).toContainText(theirs, {
      timeout: 10_000,
    });
    await online(page);
    await expect(tomorrowDinner(page)).toContainText(theirs, {
      timeout: 10_000,
    });
    const dinner = s.recordsOf("plans").filter((r) => r.slot === "dinner");
    expect(dinner).toHaveLength(1);
    expect(dinner[0]?.version).toBe(3);
    await second.close();
  });

  test("offline, nothing waits", async ({ page }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    m.api.down = true;
    const dish = await swapDinner(m.k, page);
    await expect(tomorrowDinner(page)).toContainText(dish);
    await m.k.settings();
    await expect(page.getByText("Signed in as Mayur")).toBeVisible();
    m.api.down = false;
    await page.reload();
    await expect
      .poll(() => s.recordsOf("plans").some((r) => r.version === 2), {
        timeout: 10_000,
      })
      .toBe(true);
  });

  test("leave, and remove the cook", async ({ page, browser }) => {
    const s = householdServer();
    const m = await mayur(page, s);
    s.codes.set("COOK2222", { kind: "cook", by: null });
    s.start("COOK2222", "cook");

    const second = await browser.newContext();
    const other = await second.newPage();
    const p = await priya(other, s);
    await p.k.settings();
    await household(other).getByRole("button", { name: "Leave" }).click();
    await expect(
      other.getByRole("button", { name: "Start a household" }),
    ).toBeVisible();
    await expect(other.getByText("Signed in as Priya")).toBeVisible();
    await second.close();

    await m.k.settings();
    await expect(household(page).getByText("Priya, plans")).toHaveCount(0);
    await expect(
      household(page).getByText("The cook, on Telegram"),
    ).toBeVisible();
    await household(page)
      .getByRole("button", { name: "Remove The cook" })
      .click();
    await expect(
      household(page).getByText("The cook, on Telegram"),
    ).toHaveCount(0);
    expect(
      s.asked.filter((a) => a.startsWith("DELETE /api/household/members/")),
    ).toHaveLength(2);
  });
});
