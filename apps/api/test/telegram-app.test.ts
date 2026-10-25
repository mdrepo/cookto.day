import { describe, expect, test } from "bun:test";
import { telegramAppSignIn } from "../src/auth/telegram-app.js";
import { getHousehold } from "../src/household/routes.js";
import { cookieValue, withCookie } from "./auth-support.js";
import { MAYUR, signedInAs } from "./household-flow.js";
import { ask, harness } from "./messenger-support.js";

// specs/241, criterion 11's server half: a page "Change" opened inside
// Telegram signs in with the proof Telegram hands it, checked with the
// bot's token (Telegram's rule for web apps). The same Telegram account as
// the planner's sign-in gets a session; a forged or day-old proof doesn't.

const TOKEN = "123456:test-token-not-a-real-one";
const T0 = "2026-10-21T16:40:00.000Z";
const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | string, data: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? enc.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", k, enc.encode(data));
}

const hex = (b: ArrayBuffer) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** The init data Telegram hands a web app it opens, signed with `token`. */
async function proof(
  user: { id: string; name: string },
  at: string,
  token = TOKEN,
) {
  const fields: Record<string, string> = {
    auth_date: String(Math.floor(Date.parse(at) / 1000)),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: Number(user.id), first_name: user.name }),
  };
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k] ?? ""}`)
    .join("\n");
  const secret = await hmac("WebAppData", token);
  const params = new URLSearchParams(fields);
  params.set("hash", hex(await hmac(secret, check)));
  return params.toString();
}

async function setup() {
  const h = harness(T0);
  h.deps.telegramToken = TOKEN;
  await signedInAs(h, MAYUR, MAYUR.id);
  return h;
}

const post = (initData: string) =>
  ask("POST", "/api/auth/telegram", { initData });

/** Someone with no account yet (specs/260). */
const ASHA = { id: "77", name: "Asha" };

describe("11. Tomorrow, opened from Telegram: the proof", () => {
  test("Telegram's proof for the planner's account: a session, as signing in gives", async () => {
    const h = await setup();
    const response = await telegramAppSignIn(
      post(await proof(MAYUR, T0)),
      h.deps,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Mayur" });
    const session = cookieValue(response) ?? "";
    expect(session).not.toBe("");
    const me = await getHousehold(
      withCookie(ask("GET", "/api/household"), session),
      h.deps,
    );
    // Signed in: no household yet is 404, not 401.
    expect(me.status).toBe(404);
  });

  test("a forged proof, one signed with another token, or a day old: 401, no session", async () => {
    const h = await setup();
    const forged = (await proof(MAYUR, T0)).replace(
      /hash=[0-9a-f]+/,
      `hash=${"0".repeat(64)}`,
    );
    const other = await proof(MAYUR, T0, "999:another-bot");
    const old = await proof(
      MAYUR,
      new Date(Date.parse(T0) - 25 * 3_600_000).toISOString(),
    );
    for (const initData of [forged, other, old, "", "user=%7B%7D"]) {
      const response = await telegramAppSignIn(post(initData), h.deps);
      expect(response.status).toBe(401);
      expect(cookieValue(response)).toBeNull();
    }
  });

  test("specs/260, 2: a valid proof from someone with no account: the account, and a session", async () => {
    // "Set up your kitchen" opens the same page for someone who never
    // signed in: the proof makes their account, with the identity a
    // sign-in code's Start makes, once.
    const h = await setup();
    const response = await telegramAppSignIn(
      post(await proof(ASHA, T0)),
      h.deps,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Asha" });
    expect(cookieValue(response) ?? "").not.toBe("");
    expect(h.auth.identities.filter((i) => i.userId === "77")).toMatchObject([
      { channel: "fake", userId: "77", name: "Asha" },
    ]);
    expect(h.auth.accounts.size).toBe(2);

    const again = await telegramAppSignIn(post(await proof(ASHA, T0)), h.deps);
    expect(again.status).toBe(200);
    expect(cookieValue(again)).not.toBe(cookieValue(response));
    expect(h.auth.accounts.size).toBe(2);
  });

  test("specs/260, 2: a forged or day-old proof from someone with no account: refused, no account", async () => {
    const h = await setup();
    const forged = (await proof(ASHA, T0)).replace(
      /hash=[0-9a-f]+/,
      `hash=${"0".repeat(64)}`,
    );
    const old = await proof(
      ASHA,
      new Date(Date.parse(T0) - 25 * 3_600_000).toISOString(),
    );
    for (const initData of [forged, old]) {
      const response = await telegramAppSignIn(post(initData), h.deps);
      expect(response.status).toBe(401);
    }
    expect(h.auth.accounts.size).toBe(1);
    // Then the real proof: the one account, Asha's.
    const ok = await telegramAppSignIn(post(await proof(ASHA, T0)), h.deps);
    expect(await ok.json()).toEqual({ name: "Asha" });
    expect(h.auth.accounts.size).toBe(2);
  });
});
