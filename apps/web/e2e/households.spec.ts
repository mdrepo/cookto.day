import { expect, test } from "@playwright/test";
import { evening, fakeShare, planner, shared } from "./support/cook.js";
import { Cooking } from "./support/cooking.js";
import {
  fakeHouseholdApi,
  household,
  householdServer,
  signIn,
  tomorrowDinner,
} from "./support/household.js";

// specs/217-households.md, criteria 1, 2, 3, 6 and 9: signing in starts the
// household from the phone's records; invites by role; joining replaces a
// phone's kitchen; deleting the account. One server in the test, the API
// faked in each page (ADR 0025).

test.describe("The household", () => {
  test("signing in starts the household", async ({ page }) => {
    const s = householdServer();
    await fakeHouseholdApi(page, s);
    await planner(page);
    const k = await evening(page);
    await k.settings();
    await signIn(page, s, "Mayur");
    await expect(household(page)).toBeVisible();
    await expect(household(page).getByText("Mayur, plans")).toBeVisible();
    const [made] = s.created;
    expect(made?.records.map((r) => r.collection)).toContain("plans");
    expect(made?.records.map((r) => r.collection)).toContain("members");
    expect(s.recordsOf("plans").length).toBeGreaterThan(0);
  });

  test("invite a planner, and the cook", async ({ page }) => {
    const s = householdServer();
    await fakeShare(page);
    await fakeHouseholdApi(page, s);
    await planner(page);
    const k = new Cooking(page);
    await k.start();
    await k.settings();
    await signIn(page, s, "Mayur");
    await household(page).getByRole("button", { name: "Invite" }).click();
    await k.press("Someone who plans");
    const code = page.getByRole("status", { name: "Household" });
    await expect(code).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await k.press("Send the link");
    const link = (await shared(page))[0] ?? "";
    expect(link).toMatch(
      /^https:\/\/t\.me\/cookto_day_bot\?start=[A-Z0-9]{8}$/,
    );
    s.start(link.split("start=")[1] ?? "", "Priya");
    await expect(household(page).getByText("Priya, plans")).toBeVisible({
      timeout: 10_000,
    });

    await household(page).getByRole("button", { name: "Invite" }).click();
    await k.press("The cook");
    const cookCode = (await code.textContent())?.replace("-", "") ?? "";
    s.start(cookCode, "cook");
    await expect(
      household(page).getByText("The cook, on Telegram"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("joining replaces this phone's kitchen; an untouched sample isn't asked", async ({
    page,
    browser,
  }) => {
    const s = householdServer();
    s.inHousehold.add("Priya");
    s.members.push({
      id: "m-0",
      role: "plan",
      kind: "account",
      name: "Mayur",
      stopped: false,
      account: "Mayur",
    });
    s.members.push({
      id: "m-1",
      role: "plan",
      kind: "account",
      name: "Priya",
      stopped: false,
      account: "Priya",
    });
    s.put("plans", {
      id: "p-theirs",
      version: 1,
      updatedAt: "2026-10-19T10:00:00.000Z",
      deletedAt: null,
      on: "2026-10-20",
      slot: "dinner",
      dish: "aloo-gobi",
      prep: null,
    });
    await fakeHouseholdApi(page, s);
    await planner(page);
    const k = await evening(page);
    const own = await k.dishOf(tomorrowDinner(page));
    await k.settings();
    await signIn(page, s, "Priya");
    await expect(
      page.getByText(
        "This phone has its own kitchen. Replace it with Mayur's?",
      ),
    ).toBeVisible();
    await k.press("Replace");
    await expect(household(page).getByText("Priya, plans")).toBeVisible();
    await k.home();
    await expect(page.getByRole("region", { name: "Tomorrow" })).toBeVisible();
    await expect(tomorrowDinner(page)).toContainText("Aloo gobi", {
      timeout: 10_000,
    });
    expect(own).not.toBe("Aloo gobi");
    expect(s.created).toEqual([]);

    // A fresh phone with only the sample: no question.
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await fakeHouseholdApi(other, s);
    const f = new Cooking(other);
    await f.start("/?sample");
    await f.settings();
    await signIn(other, s, "Priya");
    await expect(household(other).getByText("Priya, plans")).toBeVisible();
    await expect(other.getByText("This phone has its own kitchen")).toHaveCount(
      0,
    );
    await fresh.close();
  });

  test("delete the account", async ({ page }) => {
    const s = householdServer();
    await fakeHouseholdApi(page, s);
    await planner(page);
    const k = await evening(page);
    await k.settings();
    await signIn(page, s, "Mayur");
    await household(page)
      .getByRole("button", { name: "Delete my account" })
      .click();
    await expect(
      page.getByText("This deletes your account and, as the last member"),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete my account" })
      .click();
    await expect(k.button("Continue with Telegram")).toBeVisible();
    expect(s.asked).toContain("DELETE /api/account");
    await k.home();
    await expect(page.getByRole("region", { name: "Tomorrow" })).toBeVisible();
  });
});
