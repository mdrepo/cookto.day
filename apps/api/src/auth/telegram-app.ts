import { json, problem } from "../http.js";
import { iso, type MessengerDeps } from "../messenger/deps.js";
import { sessionCookie } from "./cookie.js";

// Signing in from a page the bot opened inside Telegram (specs/241): the
// page sends the init data Telegram handed it, and the API checks it with
// the bot's token, by Telegram's rule for web apps. The Telegram account
// it proves gets a session, as signing in with the bot gives; the page
// never sees the token. A proof older than a day is refused.

const MAX_AGE_MS = 24 * 3_600_000;
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

/** The same length, and every character compared: no early way out. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The Telegram user id the init data proves, or null. */
export async function provenUser(
  initData: string,
  token: string,
  now: number,
): Promise<string | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  const check = [...params.entries()]
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = await hmac("WebAppData", token);
  if (!same(hex(await hmac(secret, check)), hash)) return null;
  const at = Number(params.get("auth_date")) * 1000;
  if (!Number.isFinite(at) || now - at > MAX_AGE_MS) return null;
  try {
    const user = JSON.parse(params.get("user") ?? "") as { id?: unknown };
    return typeof user.id === "number" || typeof user.id === "string"
      ? String(user.id)
      : null;
  } catch {
    return null;
  }
}

/** POST /api/auth/telegram { initData } */
export async function telegramAppSignIn(
  request: Request,
  d: MessengerDeps,
): Promise<Response> {
  const started = d.now();
  const token = d.telegramToken;
  if (!token) return problem(503, "off");
  let initData: unknown;
  try {
    const body: unknown = await request.json();
    initData = (body as { initData?: unknown } | null)?.initData;
  } catch {
    return problem(400, "json");
  }
  if (typeof initData !== "string") return problem(400, "json");
  const user = await provenUser(initData, token, started);
  if (user === null) return problem(401, "proof");
  const got = await d.auth.sessionFor(
    d.messenger.channel.name,
    user,
    iso(started),
  );
  if (got === null) return problem(404, "account");
  d.log({ route: "auth/telegram", status: 200, ms: d.now() - started });
  return json(
    200,
    { name: got.name },
    { "set-cookie": sessionCookie(got.session) },
  );
}
