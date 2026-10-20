import type { Page } from "@playwright/test";

// Sign in with Telegram, as the browser tests play it (specs/216): the API
// faked in the page (ADR 0025). The test is the server: it decides when
// Start happened, and whether the session still works.

/** When a code made at 7 pm runs out: ten minutes on, as the API says it. */
const CODE_RUNS_OUT = new Date("2026-10-19T19:10:00").toISOString();
/** The next code, asked for after that, runs out ten minutes later still. */
const NEXT_RUNS_OUT = new Date("2026-10-19T19:21:00").toISOString();

/** Two codes, so "Try again" is seen to make a new one. */
const CODES = ["KM7Q4HTX", "PR8W5JTY"];

export interface SignInApi {
  /** Start has happened in the bot: the next poll signs the phone in. */
  started: boolean;
  /** Whether the session cookie still works: `me` answers 200 or 401. */
  session: boolean;
  /** What the page asked: "start", "status", "me", "signOut". */
  asked: string[];
}

export async function fakeSignInApi(page: Page): Promise<SignInApi> {
  const state: SignInApi = { started: false, session: true, asked: [] };
  let made = 0;
  await page.route("**/api/auth/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (method === "POST" && path === "/api/auth/links") {
      state.asked.push("start");
      made++;
      await json(201, {
        code: CODES[(made - 1) % CODES.length],
        token: "sign-in-token-for-the-test",
        expiresAt: made === 1 ? CODE_RUNS_OUT : NEXT_RUNS_OUT,
      });
      return;
    }
    if (method === "GET" && path.startsWith("/api/auth/links/")) {
      state.asked.push("status");
      await json(
        200,
        state.started
          ? { used: true, name: "Mayur" }
          : { used: false, state: "waiting" },
      );
      return;
    }
    if (method === "GET" && path === "/api/auth/me") {
      state.asked.push("me");
      if (state.session) await json(200, { name: "Mayur" });
      else await json(401, { error: "session" });
      return;
    }
    if (method === "DELETE" && path === "/api/auth/session") {
      state.asked.push("signOut");
      state.session = false;
      await route.fulfill({ status: 204 });
      return;
    }
    await json(404, { error: "not-found" });
  });
  return state;
}

/** This phone is signed in as Mayur, from an earlier day. */
export async function signedIn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      "cookto.day:signedIn",
      JSON.stringify({ name: "Mayur", at: "2026-10-18T10:00:00.000Z" }),
    );
  });
}
