import { describe, expect, test } from "bun:test";
import { type Keys, keysChecker } from "../src/keys.js";

// #202: GET /api/health/keys says whether each saved key works, by asking
// the service itself. Never the value, which stays write-only in Cloudflare.

const KEYS = {
  telegram: "123456789:AAHmadeUpTokenForTheTestOnly_0123456789",
  supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  supabaseKey: "sb_publishable_madeUpForTheTest",
  gemini: "AQ.madeUpGeminiKeyForTheTestOnly",
};

type Answer = (url: string, init: RequestInit) => Response | Error;

/** A fake network: one answer per service, and a record of what was asked. */
function network(answer: Answer) {
  const asked: { url: string; headers: Record<string, string> }[] = [];
  const send = (url: string, init: RequestInit) => {
    asked.push({
      url,
      headers: { ...(init.headers as Record<string, string>) },
    });
    const reply = answer(url, init);
    return reply instanceof Error
      ? Promise.reject(reply)
      : Promise.resolve(reply);
  };
  return { send, asked };
}

const ok = (body: unknown = {}) =>
  new Response(JSON.stringify(body), { status: 200 });

const allGood: Answer = (url) =>
  url.includes("telegram")
    ? ok({ ok: true, result: { username: "cooktoday_bot" } })
    : ok();

function checker(answer: Answer, keys: Keys = KEYS, start = 0) {
  const clock = { now: start };
  const net = network(answer);
  const check = keysChecker({ keys, send: net.send, now: () => clock.now });
  return { check, clock, ...net };
}

describe("the keys health check", () => {
  test("every key good: ok, and the bot's name", async () => {
    const { check, asked } = checker(allGood);
    expect(await check()).toEqual({
      telegram: { state: "ok", bot: "cooktoday_bot" },
      supabase: { state: "ok" },
      gemini: { state: "ok" },
    });
    expect(asked.map((a) => new URL(a.url).host).sort()).toEqual([
      "abcdefghijklmnopqrst.supabase.co",
      "api.telegram.org",
      "generativelanguage.googleapis.com",
    ]);
  });

  test("the keys travel the way each service expects, and never in the answer", async () => {
    const { check, asked } = checker(allGood);
    const report = JSON.stringify(await check());
    for (const value of Object.values(KEYS))
      expect(report).not.toContain(value);
    const by = (host: string) =>
      asked.find((a) => a.url.includes(host)) ?? { url: "", headers: {} };
    expect(by("telegram").url).toBe(
      `https://api.telegram.org/bot${KEYS.telegram}/getMe`,
    );
    expect(by("supabase").url).toBe(`${KEYS.supabaseUrl}/auth/v1/health`);
    expect(by("supabase").headers.apikey).toBe(KEYS.supabaseKey);
    expect(by("googleapis").headers["x-goog-api-key"]).toBe(KEYS.gemini);
  });

  test("a service that says no: rejected; one that's down: unreachable", async () => {
    const { check } = checker((url) => {
      if (url.includes("telegram")) return new Response("", { status: 401 });
      if (url.includes("supabase")) return new Error("connection refused");
      return new Response("", { status: 400 });
    });
    expect(await check()).toEqual({
      telegram: { state: "rejected" },
      supabase: { state: "unreachable" },
      gemini: { state: "rejected" },
    });
  });

  test("a key not saved yet is missing, and the service isn't asked", async () => {
    const { check, asked } = checker(allGood, {
      ...KEYS,
      telegram: undefined,
      supabaseKey: undefined,
    });
    expect(await check()).toEqual({
      telegram: { state: "missing" },
      supabase: { state: "missing" },
      gemini: { state: "ok" },
    });
    expect(asked).toHaveLength(1);
  });

  test("the answer is kept for a minute, so the services aren't hammered", async () => {
    const { check, asked, clock } = checker(allGood);
    await check();
    clock.now = 59_000;
    await check();
    expect(asked).toHaveLength(3);
    clock.now = 60_000;
    await check();
    expect(asked).toHaveLength(6);
  });
});
