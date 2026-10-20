import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { type AuthStore, functionAuth } from "../src/auth.js";
import { functionLinks, type Links } from "../src/links.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/216, criterion 10, on Postgres: a sign-in link with its one-use code,
// the identity Start makes or finds, the session handed out once by hash,
// its last use and its 30 days, and that a cook's code and a sign-in code
// never stand in for each other (db/migrations/0004).

const sql = DATABASE_URL ? connect() : null;
const T0 = "2026-10-20T19:00:00.000Z";
const minutes = (n: number) =>
  new Date(new Date(T0).getTime() + n * 60_000).toISOString();
const days = (n: number) => minutes(n * 24 * 60);

const sha256 = async (text: string) => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const MAYUR = { id: "42", name: "Mayur" };
/** A query's rows, in the shape the test knows; the client itself says any. */
const rows = <T>(q: Promise<unknown>) => q as Promise<T[]>;

describe.skipIf(sql === null)("sign-in, on Postgres", () => {
  let auth: AuthStore;
  let links: Links;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    auth = functionAuth(sqlCall(sql), SECRET);
    links = functionLinks(sqlCall(sql), SECRET);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

  async function made() {
    const link = await auth.makeLink("addr-1", T0);
    if (!link.ok) throw new Error("not made");
    return { ...link, hash: await sha256(link.token) };
  }

  test("a sign-in link: a readable code, a token seen once, ten minutes, waiting", async () => {
    const link = await made();
    expect(link.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    expect(link.token).toMatch(/^[0-9a-f]{64}$/);
    expect(link.expiresAt).toBe(minutes(10));
    expect(await auth.claim(link.hash, T0)).toEqual({ state: "waiting" });
    expect(await auth.claim(link.hash, minutes(11))).toEqual({
      state: "expired",
    });
  });

  test("sign-in links count toward the same ten a day as the cook's", async () => {
    for (let i = 0; i < 6; i++)
      expect((await auth.makeLink("addr-2", T0)).ok).toBe(true);
    for (let i = 0; i < 4; i++)
      expect((await links.make("addr-2", T0)).ok).toBe(true);
    expect(await auth.makeLink("addr-2", T0)).toEqual({
      ok: false,
      reason: "limit",
    });
  });

  test("Start makes the account once, and finds it the next time", async () => {
    const first = await made();
    expect(await auth.start(first.code, "telegram", MAYUR, T0)).toEqual({
      ok: true,
      name: "Mayur",
    });
    const second = await made();
    expect(await auth.start(second.code, "telegram", MAYUR, T0)).toEqual({
      ok: true,
      name: "Mayur",
    });
    if (!sql) return;
    const [count] = await rows<{ n: number }>(
      sql`select count(*)::int as n from accounts`,
    );
    expect(count?.n).toBe(1);
    const people = await rows<Record<string, string>>(
      sql`select channel, user_id, name from identities`,
    );
    expect(people).toEqual([
      { channel: "telegram", user_id: "42", name: "Mayur" },
    ]);
  });

  test("a used, old or unknown code is bad; a cook's code is not a sign-in", async () => {
    const link = await made();
    await auth.start(link.code, "telegram", MAYUR, T0);
    expect(await auth.start(link.code, "telegram", MAYUR, T0)).toEqual({
      ok: false,
      reason: "bad",
    });
    const old = await made();
    expect(await auth.start(old.code, "telegram", MAYUR, minutes(11))).toEqual({
      ok: false,
      reason: "bad",
    });
    expect(await auth.start("NOPE2222", "telegram", MAYUR, T0)).toEqual({
      ok: false,
      reason: "not-sign-in",
    });
    const cook = await links.make("addr-3", T0);
    if (!cook.ok) throw new Error("not made");
    expect(await auth.start(cook.code, "telegram", MAYUR, T0)).toEqual({
      ok: false,
      reason: "not-sign-in",
    });
  });

  test("a sign-in code can't connect a cook", async () => {
    const link = await made();
    expect(await links.connect(link.code, "telegram", "chat-42", T0)).toEqual({
      ok: false,
    });
    expect(await auth.claim(link.hash, T0)).toEqual({ state: "waiting" });
  });

  test("the session is handed out once, by its hash; then the link is gone", async () => {
    const link = await made();
    await auth.start(link.code, "telegram", MAYUR, T0);
    const claimed = await auth.claim(link.hash, minutes(1));
    if (claimed.state !== "used") throw new Error(claimed.state);
    expect(claimed.name).toBe("Mayur");
    expect(claimed.session).toMatch(/^[0-9a-f]{64}$/);
    expect(await auth.claim(link.hash, minutes(1))).toEqual({ state: "gone" });
    expect(await auth.claim("not-a-hash", minutes(1))).toEqual({
      state: "gone",
    });
    if (!sql) return;
    const kept = await rows<{ hash: string }>(sql`select hash from sessions`);
    expect(kept).toEqual([{ hash: await sha256(claimed.session) }]);
  });

  test("a session answers the account and name, moves its last use, and ends", async () => {
    const link = await made();
    await auth.start(link.code, "telegram", MAYUR, T0);
    const claimed = await auth.claim(link.hash, T0);
    if (claimed.state !== "used") throw new Error(claimed.state);
    const hash = await sha256(claimed.session);
    const session = await auth.session(hash, days(2));
    expect(session?.name).toBe("Mayur");
    expect(session?.account).toMatch(/^[0-9a-f-]{36}$/);
    if (sql) {
      const [row] = await rows<{ at: string }>(
        sql`select msg_iso(last_used_at) as at from sessions`,
      );
      expect(row?.at).toBe(days(2));
    }
    expect(await auth.end(hash)).toBe(true);
    expect(await auth.end(hash)).toBe(false);
    expect(await auth.session(hash, days(2))).toBeNull();
  });

  test("thirty days after its last use a session is gone, and housekeeping sweeps it", async () => {
    const link = await made();
    await auth.start(link.code, "telegram", MAYUR, T0);
    const claimed = await auth.claim(link.hash, T0);
    if (claimed.state !== "used") throw new Error(claimed.state);
    const hash = await sha256(claimed.session);
    expect(await auth.session(hash, days(29))).not.toBeNull();
    expect(await auth.session(hash, days(29 + 31))).toBeNull();

    const other = await made();
    await auth.start(other.code, "telegram", { id: "7", name: "Priya" }, T0);
    const more = await auth.claim(other.hash, T0);
    if (more.state !== "used") throw new Error(more.state);
    expect(await auth.housekeeping(days(31))).toEqual({ sessions: 1 });
    expect(await auth.housekeeping(days(31))).toEqual({ sessions: 0 });
  });
});
