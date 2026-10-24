import { expect, type Page } from "@playwright/test";
import { evening, planner } from "./cook.js";
import {
  fakeHouseholdApi,
  household,
  type HouseholdServer,
  signIn,
} from "./household.js";

// The household's schedule, as the browser tests play it (specs/240): meal
// times and the cook's days off in Settings > Household, and the one synced
// settings record they travel in. Two phones as in household-sync.spec.ts.

/** Settings > Household > Meal times. */
export const mealTimes = (page: Page) =>
  household(page).getByRole("region", { name: "Meal times" });

/** The cook's days off, on her row in Household. */
export const daysOff = (page: Page) =>
  household(page).getByRole("region", { name: "Days off" });

/** The household's settings record, as the server has it. */
export const settingsOf = (s: HouseholdServer) =>
  s.recordsOf("household-settings")[0] as
    | {
        version: number;
        country?: string;
        beans?: string;
        sorted?: string | null;
        timeZone?: string | null;
        mealTimes?: Record<string, string>;
        daysOff?: { weekdays: number[]; dates: string[] };
      }
    | undefined;

/** Mayur's phone: a planner's evening, signed in, the household started. */
export async function mayur(page: Page, s: HouseholdServer) {
  const api = await fakeHouseholdApi(page, s);
  await planner(page);
  const k = await evening(page);
  await k.settings();
  await signIn(page, s, "Mayur");
  await expect(household(page).getByText("Mayur, plans")).toBeVisible();
  return { k, api };
}

/** Priya's phone, a member already, signed in, the household's kitchen in. */
export async function priya(page: Page, s: HouseholdServer) {
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
  return { k, api };
}

/** The cook joins by an invite's code, as the bot would tell the API. */
export function cookJoins(s: HouseholdServer): void {
  s.codes.set("COOK2222", { kind: "cook", by: null });
  s.start("COOK2222", "cook");
}
