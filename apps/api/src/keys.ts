import type { Send } from "./network.js";

// GET /api/health/keys (#202). The Worker's secrets are write-only, so this
// is the one way to learn whether a saved key works: ask each service a
// question that costs nothing. The answer names states, never values, and
// is kept a minute so the endpoint can't be used to hammer the services.
// With the bot token good, it also makes sure Telegram's webhook points at
// us (spec #207): only the Worker holds both the token and the secret.

export type KeyState = "ok" | "rejected" | "missing" | "unreachable";

export interface KeysReport {
  telegram: { state: KeyState; bot?: string; webhook?: "set" | "missing" };
  supabase: { state: KeyState };
  gemini: { state: KeyState };
}

/** The secrets, as the Worker's environment hands them: unset until saved. */
export interface Keys {
  telegram?: string | undefined;
  supabaseUrl?: string | undefined;
  supabaseKey?: string | undefined;
  gemini?: string | undefined;
}

export interface KeysOptions {
  keys: Keys;
  send: Send;
  /** Milliseconds since 1970. */
  now: () => number;
  timeoutMs?: number;
  /** Points Telegram's webhook at us, when the messenger is set up. */
  install?: (() => Promise<"set" | "kept">) | undefined;
}

const KEEP_MS = 60_000;
const TIMEOUT_MS = 5_000;
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

/** 2xx is a good key; a refusal is a bad one; anything else, the service. */
function stateOf(response: Response | null): KeyState {
  if (response === null) return "unreachable";
  if (response.ok) return "ok";
  return [400, 401, 403].includes(response.status) ? "rejected" : "unreachable";
}

async function ask(
  send: Send,
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    return await send(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return null;
  }
}

async function telegram(
  options: KeysOptions,
  timeoutMs: number,
): Promise<KeysReport["telegram"]> {
  const token = options.keys.telegram;
  if (token === undefined || token === "") return { state: "missing" };
  const response = await ask(
    options.send,
    `https://api.telegram.org/bot${token}/getMe`,
    {},
    timeoutMs,
  );
  const state = stateOf(response);
  if (state !== "ok" || response === null) return { state };
  const body = (await response.json().catch(() => ({}))) as {
    result?: { username?: string };
  };
  const bot = body.result?.username;
  const report: KeysReport["telegram"] =
    bot === undefined ? { state } : { state, bot };
  if (options.install === undefined) return report;
  const webhook = await options.install().then(
    () => "set" as const,
    () => "missing" as const,
  );
  return { ...report, webhook };
}

async function supabase(
  options: KeysOptions,
  timeoutMs: number,
): Promise<KeysReport["supabase"]> {
  const { supabaseUrl: url, supabaseKey: key } = options.keys;
  if (!url || !key) return { state: "missing" };
  const response = await ask(
    options.send,
    `${url}/auth/v1/health`,
    { apikey: key },
    timeoutMs,
  );
  return { state: stateOf(response) };
}

async function gemini(
  options: KeysOptions,
  timeoutMs: number,
): Promise<KeysReport["gemini"]> {
  const key = options.keys.gemini;
  if (key === undefined || key === "") return { state: "missing" };
  const response = await ask(
    options.send,
    `${GEMINI}?pageSize=1`,
    { "x-goog-api-key": key },
    timeoutMs,
  );
  return { state: stateOf(response) };
}

/** A check that asks all three services at once and keeps the answer. */
export function keysChecker(options: KeysOptions): () => Promise<KeysReport> {
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  let kept: { report: KeysReport; until: number } | null = null;
  return async () => {
    const now = options.now();
    if (kept !== null && now < kept.until) return kept.report;
    const [tg, sb, gm] = await Promise.all([
      telegram(options, timeoutMs),
      supabase(options, timeoutMs),
      gemini(options, timeoutMs),
    ]);
    const report = { telegram: tg, supabase: sb, gemini: gm };
    kept = { report, until: now + KEEP_MS };
    return report;
  };
}
