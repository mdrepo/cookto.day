import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { functionLinks, type Links } from "../src/links.js";
import { functionStore } from "../src/store.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/207, criteria 9, 10, 12, 14 and 16, the database's half: a link is
// made with a one-use code, the cook's Start opens the conversation, sends
// are counted, stop deletes everything, and old messages go.

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

describe.skipIf(sql === null)("links, on Postgres", () => {
  let links: Links;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    links = functionLinks(sqlCall(sql), SECRET);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

  test("a link is made: a readable code, a token seen once, ten minutes", async () => {
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    expect(made.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    expect(made.token).toMatch(/^[0-9a-f]{64}$/);
    expect(made.expiresAt).toBe(minutes(10));
    expect(await links.status(await sha256(made.token), T0)).toEqual({
      state: "waiting",
    });
  });

  test("ten links a day per address, then no more", async () => {
    for (let i = 0; i < 10; i++)
      expect((await links.make("addr-2", T0)).ok).toBe(true);
    expect(await links.make("addr-2", T0)).toEqual({
      ok: false,
      reason: "limit",
    });
    expect((await links.make("addr-3", T0)).ok).toBe(true);
    expect((await links.make("addr-2", days(1))).ok).toBe(true);
  });

  test("the cook connects, once, and the planner sees it", async () => {
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const hash = await sha256(made.token);
    const got = await links.connect(made.code, "telegram", "123", minutes(1));
    expect(got).toMatchObject({
      ok: true,
      conversation: {
        channel: "telegram",
        chat: "123",
        owner: { kind: "link", id: hash },
      },
    });
    expect(await links.status(hash, minutes(2))).toMatchObject({
      state: "connected",
    });
    expect(
      await links.connect(made.code, "telegram", "999", minutes(2)),
    ).toEqual({ ok: false });
  });

  test("a code typed with its dash and in lower case still works", async () => {
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const typed =
      `${made.code.slice(0, 4)}-${made.code.slice(4)}`.toLowerCase();
    expect((await links.connect(typed, "telegram", "123", minutes(1))).ok).toBe(
      true,
    );
  });

  test("a code runs out after ten minutes; an unknown one is gone", async () => {
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const hash = await sha256(made.token);
    expect(
      await links.connect(made.code, "telegram", "123", minutes(11)),
    ).toEqual({ ok: false });
    expect(await links.status(hash, minutes(11))).toEqual({ state: "expired" });
    expect(await links.status("no-such-hash", T0)).toEqual({ state: "gone" });
  });

  test("twenty sends a day, counted on the link", async () => {
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const hash = await sha256(made.token);
    expect(await links.sendAllowed(hash, T0)).toEqual({
      ok: false,
      reason: "gone",
    });
    await links.connect(made.code, "telegram", "123", T0);
    for (let i = 0; i < 20; i++)
      expect((await links.sendAllowed(hash, minutes(i))).ok).toBe(true);
    expect(await links.sendAllowed(hash, minutes(30))).toEqual({
      ok: false,
      reason: "limit",
    });
    expect((await links.sendAllowed(hash, days(1))).ok).toBe(true);
  });

  test("stop removes the conversation, its messages and the link", async () => {
    if (!sql) return;
    const store = functionStore(sqlCall(sql), SECRET);
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const hash = await sha256(made.token);
    const got = await links.connect(made.code, "telegram", "123", T0);
    if (!got.ok) throw new Error("not connected");
    const m = await store.add({
      conversation: got.conversation.id,
      direction: "out",
      kind: "text",
      content: { kind: "text", text: "hi" },
      answers: null,
      channelId: null,
      at: T0,
      status: "queued",
      error: null,
      context: null,
    });
    await store.enqueue(m.id, T0);
    expect(await links.remove(hash)).toBe(true);
    expect(await store.get(got.conversation.id)).toBeNull();
    expect(await store.message(m.id)).toBeNull();
    expect(await store.claim(minutes(1), minutes(2))).toEqual([]);
    expect(await links.status(hash, T0)).toEqual({ state: "gone" });
    expect(await links.remove(hash)).toBe(false);
  });

  test("housekeeping: messages older than 90 days, day-old updates, dead links", async () => {
    if (!sql) return;
    const store = functionStore(sqlCall(sql), SECRET);
    const made = await links.make("addr-1", T0);
    if (!made.ok) throw new Error("not made");
    const got = await links.connect(made.code, "telegram", "123", T0);
    if (!got.ok) throw new Error("not connected");
    const row = (at: string) => ({
      conversation: got.conversation.id,
      direction: "in" as const,
      kind: "text",
      content: { kind: "text", text: "x" },
      answers: null,
      channelId: null,
      at,
      status: null,
      error: null,
      context: null,
    });
    const old = await store.add(row(T0));
    const recent = await store.add(row(days(2)));
    await store.seen("telegram", "u1", T0);
    await links.make("addr-9", T0); // never used: dead after a day
    const gone = await links.housekeeping(days(91));
    expect(gone).toEqual({ messages: 1, updates: 1, links: 1 });
    expect(await store.message(old.id)).toBeNull();
    expect(await store.message(recent.id)).not.toBeNull();
    expect(await store.seen("telegram", "u1", days(91))).toBe(false);
  });
});
