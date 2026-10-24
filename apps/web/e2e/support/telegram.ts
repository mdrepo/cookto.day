import type { Page } from "@playwright/test";
import type { HouseholdServer } from "./household.js";

// Pages the bot opens inside Telegram (specs/241): the cook's recipes, and
// Tomorrow from "Change". Telegram hands a page it opens its proof of who
// opened it after the address's #; the fake API takes a proof that says
// "good" as the planner's, and refuses the rest, as the API's check would.

/** The cook's "Recipes" link: poha for 3 at breakfast, dal tadka for 2 at lunch. */
export const RECIPES =
  "/#/cook/2026-10-20?d=breakfast.poha.3,lunch.dal-tadka.2&l=en";

/** The address "Change" opens, with Telegram's proof after the #. */
export const fromTelegram = (proof: string) =>
  `/?from=telegram#tgWebAppData=${encodeURIComponent(
    `user=${encodeURIComponent('{"id":42,"first_name":"Mayur"}')}&auth_date=1&hash=${proof}`,
  )}&tgWebAppVersion=7.0&tgWebAppPlatform=android`;

/** POST /api/auth/telegram, faked: a "good" proof signs in as `name`. */
export async function fakeTelegramProof(
  page: Page,
  s: HouseholdServer,
  name: string,
) {
  const asked: string[] = [];
  await page.route("**/api/auth/telegram", async (route) => {
    const { initData } = route.request().postDataJSON() as {
      initData: string;
    };
    asked.push(initData);
    if (!initData.includes("hash=good")) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "proof" }),
      });
      return;
    }
    const session = `s-${name}-telegram`;
    s.sessions.set(session, name);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "set-cookie": `session=${session}; Path=/api; SameSite=Strict`,
      },
      body: JSON.stringify({ name }),
    });
  });
  return asked;
}
