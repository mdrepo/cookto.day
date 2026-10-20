import { beforeEach, describe, expect, test } from "bun:test";
import { me, signInStatus, signOut, startSignIn } from "../src/auth/routes.js";
import { webhook } from "../src/messenger/webhook.js";
import { WORDS } from "../src/messenger/words.js";
import { cookieValue, withCookie } from "./auth-support.js";
import { incoming, linked } from "./messenger-flow.js";
import { ask, harness, type Harness } from "./messenger-support.js";

// specs/216, criteria 5 to 9: a sign-in link is made; Start makes or finds
// the account; the phone gets its session once; the session works and ends;
// the cook's code still connects her and makes no account.

const DAY = 86_400_000;
let h: Harness;
beforeEach(() => {
  h = harness();
});

const MAYUR = { id: "42", name: "Mayur" };

/** A sign-in link, and when asked, Mayur's Start with its code. */
async function signInLink(start = true) {
  const response = await startSignIn(ask("POST", "/api/auth/links"), h.deps);
  const made = (await response.json()) as { code: string; token: string };
  if (start) {
    const u = h.channel.update({
      id: `u-${made.code}`,
      chat: "chat-42",
      event: { kind: "started", code: made.code },
      from: MAYUR,
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
  }
  return made;
}

const status = (code: string, token: string) =>
  signInStatus(ask("GET", `/api/auth/links/${code}`, undefined, token), h.deps);

describe("5. a sign-in link is made", () => {
  test("201 with a code, a token, and when it runs out; the store holds a hash", async () => {
    const response = await startSignIn(ask("POST", "/api/auth/links"), h.deps);
    expect(response.status).toBe(201);
    const made = (await response.json()) as Record<string, string>;
    expect(made.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(made.token?.length).toBeGreaterThan(20);
    expect(made.expiresAt).toBe("2026-10-20T19:10:00.000Z");
    const row = h.auth.links.get(made.code ?? "");
    expect(row?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify([...h.auth.links.values()])).not.toContain(
      made.token ?? "-",
    );
  });

  test("the 11th from one address today is 429", async () => {
    for (let i = 0; i < 10; i++)
      expect(
        (await startSignIn(ask("POST", "/api/auth/links"), h.deps)).status,
      ).toBe(201);
    const over = await startSignIn(ask("POST", "/api/auth/links"), h.deps);
    expect(over.status).toBe(429);
    expect(h.logged.at(-1)).toMatchObject({ route: "auth/links", status: 429 });
  });
});

describe("6. Start makes the account, once", () => {
  test("an account with an identity; the link used; the bot says signed in", async () => {
    const made = await signInLink();
    expect([...h.auth.accounts]).toHaveLength(1);
    expect(h.auth.identities).toEqual([
      { channel: "fake", userId: "42", account: "acct-1", name: "Mayur" },
    ]);
    expect(h.auth.links.get(made.code)?.usedAt).not.toBeNull();
    expect(h.channel.deliveries).toEqual([
      {
        chat: "chat-42",
        message: { kind: "text", text: WORDS.signedIn },
        edits: undefined,
      },
    ]);
    expect(await h.store.find("fake", "chat-42")).toBeNull();
    expect(h.logged.at(-1)).toMatchObject({
      route: "messenger/telegram",
      kind: "started",
      outcome: "signed-in",
    });
  });

  test("a second link from the same person finds the same account", async () => {
    await signInLink();
    await signInLink();
    expect([...h.auth.accounts]).toHaveLength(1);
    expect(h.auth.identities).toHaveLength(1);
  });

  test("the same code again didn't work, and nothing changes", async () => {
    const made = await signInLink();
    h.channel.deliveries.length = 0;
    const u = h.channel.update({
      id: "u-again",
      chat: "chat-7",
      event: { kind: "started", code: made.code },
      from: { id: "7", name: "Someone" },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    expect(h.channel.deliveries).toEqual([
      {
        chat: "chat-7",
        message: { kind: "text", text: WORDS.badCode },
        edits: undefined,
      },
    ]);
    expect([...h.auth.accounts]).toHaveLength(1);
    expect(h.logged.at(-1)).toMatchObject({ outcome: "bad-code" });
  });
});

describe("7. the phone gets its session", () => {
  test("before Start: used is false, no cookie; after: the name and the cookie, once", async () => {
    const made = await signInLink(false);
    const waiting = await status(made.code, made.token);
    expect(waiting.status).toBe(200);
    expect(await waiting.json()).toEqual({ used: false, state: "waiting" });
    expect(waiting.headers.get("set-cookie")).toBeNull();

    const u = h.channel.update({
      id: "u-s",
      chat: "chat-42",
      event: { kind: "started", code: made.code },
      from: MAYUR,
    });
    await webhook(incoming(u), h.deps);
    const used = await status(made.code, made.token);
    expect(used.status).toBe(200);
    expect(await used.json()).toEqual({ used: true, name: "Mayur" });
    const cookie = used.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^session=[^;]+; /);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/api");
    expect(cookie).toContain(`Max-Age=${String(30 * 24 * 3600)}`);
    const session = cookieValue(used) ?? "";
    expect([...h.auth.sessions.keys()]).not.toContain(session);
    expect(h.auth.sessions.size).toBe(1);

    const again = await status(made.code, made.token);
    expect(again.status).toBe(404);
  });

  test("the code ran out: used is false, state expired", async () => {
    const made = await signInLink(false);
    h.clock.now += 11 * 60_000;
    expect(await (await status(made.code, made.token)).json()).toEqual({
      used: false,
      state: "expired",
    });
  });

  test("a wrong token is 404, and no token is 401", async () => {
    const made = await signInLink(false);
    expect((await status(made.code, "not-the-token")).status).toBe(404);
    const bare = ask("GET", `/api/auth/links/${made.code}`);
    expect((await signInStatus(bare, h.deps)).status).toBe(401);
  });
});

describe("8. the session works, and ends", () => {
  async function signedIn() {
    const made = await signInLink();
    const used = await status(made.code, made.token);
    return cookieValue(used) ?? "";
  }

  test("me: the first name, and the session's last use moves", async () => {
    const session = await signedIn();
    h.clock.now += 2 * DAY;
    const response = await me(
      withCookie(ask("GET", "/api/auth/me"), session),
      h.deps,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Mayur" });
    const [row] = [...h.auth.sessions.values()];
    expect(row?.lastUsedAt).toBe(new Date(h.clock.now).toISOString());
  });

  test("sign out: 204, the cookie cleared, and me is 401 after", async () => {
    const session = await signedIn();
    const out = await signOut(
      withCookie(ask("DELETE", "/api/auth/session"), session),
      h.deps,
    );
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(h.auth.sessions.size).toBe(0);
    const after = await me(
      withCookie(ask("GET", "/api/auth/me"), session),
      h.deps,
    );
    expect(after.status).toBe(401);
  });

  test("no cookie, or a session last used 31 days ago: 401", async () => {
    expect((await me(ask("GET", "/api/auth/me"), h.deps)).status).toBe(401);
    const session = await signedIn();
    h.clock.now += 31 * DAY;
    const old = await me(
      withCookie(ask("GET", "/api/auth/me"), session),
      h.deps,
    );
    expect(old.status).toBe(401);
    expect(h.auth.sessions.size).toBe(0);
  });
});

describe("9. the cook's code still works", () => {
  test("Start with a cook's code connects her, and makes no account", async () => {
    await linked(h);
    expect(await h.store.find("fake", "chat-1")).not.toBeNull();
    expect([...h.auth.accounts]).toHaveLength(0);
    expect(h.auth.identities).toEqual([]);
  });

  test("Start with a cook's code and a sender still makes no account", async () => {
    const made = await linked(h, false);
    const u = h.channel.update({
      id: "u-cook",
      chat: "chat-1",
      event: { kind: "started", code: made.code },
      from: { id: "1", name: "The cook" },
    });
    await webhook(incoming(u), h.deps);
    await h.settle();
    expect(h.channel.deliveries.at(-1)?.message).toEqual({
      kind: "text",
      text: WORDS.connected,
    });
    expect([...h.auth.accounts]).toHaveLength(0);
  });
});
