import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { type AuthStore, functionAuth } from "../src/auth.js";
import { functionHouseholds, type Households } from "../src/household.js";
import { functionLinks, type Links } from "../src/links.js";
import { functionStore } from "../src/store.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/217, criterion 16, on Postgres: households and members, a record by
// household, collection and id, put only when newer, changes in sequence,
// pages, the 90 days, and delete all the way down (db/migrations/0005).

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
const PRIYA = { id: "7", name: "Priya" };
const rec = (collection: string, id: string, version = 1, more = {}) => ({
  collection,
  record: { id, version, updatedAt: T0, deletedAt: null, ...more },
});

describe.skipIf(sql === null)("households, on Postgres", () => {
  let auth: AuthStore;
  let links: Links;
  let hh: Households;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    const call = sqlCall(sql);
    auth = functionAuth(call, SECRET);
    links = functionLinks(call, SECRET);
    hh = functionHouseholds(call, SECRET);
    functionStore(call, SECRET);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

  /** An account, made the way sign-in makes it. */
  async function account(from: { id: string; name: string }) {
    const link = await auth.makeLink(`addr-${from.id}`, T0);
    if (!link.ok) throw new Error("no link");
    await auth.start(link.code, "telegram", from, T0);
    const claimed = await auth.claim(await sha256(link.token), T0);
    if (claimed.state !== "used") throw new Error(claimed.state);
    const session = await auth.session(await sha256(claimed.session), T0);
    if (!session) throw new Error("no session");
    return session.account;
  }

  test("a household from records: each at its version, a change each, the account a planner; a second one refused", async () => {
    const me = await account(MAYUR);
    const made = await hh.create(
      me,
      [rec("plans", "p-1"), rec("my-dishes", "d-1")],
      T0,
    );
    if (!made.ok) throw new Error(made.reason);
    expect(made.household).toMatch(/^[0-9a-f-]{36}$/);
    const view = await hh.get(me);
    expect(view?.id).toBe(made.household);
    expect(view?.members).toEqual([
      {
        id: expect.any(String) as string,
        role: "plan",
        kind: "account",
        name: "Mayur",
        stopped: false,
      },
    ]);
    const page = await hh.changes(me, 0, 500);
    expect(
      page?.changes.map((c) => [c.seq, c.collection, c.record.id]),
    ).toEqual([
      [1, "plans", "p-1"],
      [2, "my-dishes", "d-1"],
    ]);
    expect(await hh.create(me, [], T0)).toEqual({
      ok: false,
      reason: "exists",
    });
    expect(await hh.get(await account(PRIYA))).toBeNull();
  });

  test("push: newer wins, equal or older refused with the server's copy; a stranger forbidden", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [rec("plans", "p-1")], T0);
    const newer = rec("plans", "p-1", 3, { dish: "dal" });
    expect(await hh.push(me, [newer], minutes(1))).toEqual({
      ok: true,
      refused: [],
    });
    const older = rec("plans", "p-1", 3, { dish: "bhindi" });
    expect(await hh.push(me, [older], minutes(2))).toEqual({
      ok: true,
      refused: [{ collection: "plans", record: newer.record }],
    });
    const page = await hh.changes(me, 0, 500);
    expect(page?.changes.map((c) => c.record.version)).toEqual([1, 3]);
    expect(await hh.push(await account(PRIYA), [newer], T0)).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  test("changes come in pages with a cursor, per household", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [], T0);
    const other = await account(PRIYA);
    await hh.create(other, [rec("plans", "theirs")], T0);
    const many = Array.from({ length: 7 }, (_, i) =>
      rec("plans", `p-${String(i)}`),
    );
    await hh.push(me, many, T0);
    const first = await hh.changes(me, 0, 5);
    expect(first?.changes).toHaveLength(5);
    expect(first?.more).toBe(true);
    expect(first?.reset).toBe(false);
    const second = await hh.changes(me, first?.cursor ?? 0, 5);
    expect(second?.changes.map((c) => c.record.id)).toEqual(["p-5", "p-6"]);
    expect(second?.more).toBe(false);
    expect((await hh.changes(me, second?.cursor ?? 0, 5))?.changes).toEqual([]);
  });

  test("changes older than 90 days go; a cursor from before that starts over with every record", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [rec("plans", "p-1")], T0);
    await hh.push(me, [rec("plans", "p-2")], days(1));
    expect(await hh.housekeeping(days(91))).toEqual({ changes: 1 });
    const stale = await hh.changes(me, 1, 500);
    expect(stale?.reset).toBe(true);
    expect(stale?.changes.map((c) => c.record.id).sort()).toEqual([
      "p-1",
      "p-2",
    ]);
    const fresh = await hh.changes(me, stale?.cursor ?? 0, 500);
    expect(fresh?.reset).toBe(false);
    expect(fresh?.changes).toEqual([]);
  });

  test("invites: a cook joins by chat with a conversation of the household; a planner by account", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [], T0);
    const cook = await hh.invite(me, "cook", "addr-1", T0);
    if (!cook.ok) throw new Error(cook.reason);
    const started = await hh.startInvite(
      cook.code,
      "telegram",
      "chat-7",
      null,
      T0,
    );
    if (!started.ok) throw new Error(started.reason);
    expect(started.role).toBe("cook");
    expect(started.conversation?.owner.kind).toBe("member");
    expect(
      await hh.startInvite(cook.code, "telegram", "chat-8", null, T0),
    ).toEqual({
      ok: false,
      reason: "bad",
    });
    const plan = await hh.invite(me, "plan", "addr-1", T0);
    if (!plan.ok) throw new Error(plan.reason);
    expect(
      await hh.startInvite(plan.code, "telegram", "c-7", PRIYA, T0),
    ).toEqual({
      ok: true,
      role: "plan",
    });
    const members = (await hh.get(me))?.members.map((m) => [
      m.role,
      m.kind,
      m.name,
    ]);
    expect(members).toEqual([
      ["plan", "account", "Mayur"],
      ["cook", "telegram", null],
      ["plan", "account", "Priya"],
    ]);
    expect(await hh.startInvite("NOPE2222", "telegram", "c", null, T0)).toEqual(
      {
        ok: false,
        reason: "not-invite",
      },
    );
    const signIn = await auth.makeLink("addr-2", T0);
    if (!signIn.ok) throw new Error("no link");
    expect(
      await hh.startInvite(signIn.code, "telegram", "c", null, T0),
    ).toEqual({
      ok: false,
      reason: "not-invite",
    });
  });

  test("a phone's cook link moves into the household, and stops answering to its token", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [], T0);
    const link = await links.make("addr-1", T0);
    if (!link.ok) throw new Error("no link");
    await links.connect(link.code, "telegram", "chat-1", T0);
    const hash = await sha256(link.token);
    expect(await hh.claimCook(me, hash, T0)).toEqual({ ok: true });
    expect(await links.status(hash, T0)).toEqual({ state: "gone" });
    const cooks = await hh.cooks(me, T0);
    expect(cooks.ok).toBe(true);
    expect(await hh.claimCook(me, hash, T0)).toEqual({ ok: false });
  });

  test("cooks to send to, twenty a day per household", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [], T0);
    expect(await hh.cooks(me, T0)).toEqual({ ok: false, reason: "no-cook" });
    const invite = await hh.invite(me, "cook", "addr-1", T0);
    if (!invite.ok) throw new Error(invite.reason);
    await hh.startInvite(invite.code, "telegram", "chat-7", null, T0);
    for (let i = 0; i < 20; i++) {
      const allowed = await hh.cooks(me, T0);
      expect(allowed.ok).toBe(true);
      if (allowed.ok) expect(allowed.conversations).toHaveLength(1);
    }
    expect(await hh.cooks(me, T0)).toEqual({ ok: false, reason: "limit" });
    expect((await hh.cooks(me, days(1))).ok).toBe(true);
    expect(await hh.cooks(await account(PRIYA), T0)).toEqual({
      ok: false,
      reason: "no-household",
    });
  });

  test("remove a member; delete an account; the last planner takes the household with them", async () => {
    const me = await account(MAYUR);
    await hh.create(me, [rec("plans", "p-1")], T0);
    const cook = await hh.invite(me, "cook", "addr-1", T0);
    if (!cook.ok) throw new Error(cook.reason);
    await hh.startInvite(cook.code, "telegram", "chat-7", null, T0);
    const plan = await hh.invite(me, "plan", "addr-1", T0);
    if (!plan.ok) throw new Error(plan.reason);
    await hh.startInvite(plan.code, "telegram", "c-7", PRIYA, T0);
    const view = await hh.get(me);
    const cookRow = view?.members.find((m) => m.role === "cook");
    expect(await hh.removeMember(me, cookRow?.id ?? "")).toEqual({
      ok: true,
      chat: "chat-7",
    });
    expect(await hh.removeMember(me, cookRow?.id ?? "")).toEqual({ ok: false });
    if (!sql) return;
    const conversations =
      (await sql`select count(*)::int as n from conversations`) as unknown as {
        n: number;
      }[];
    expect(conversations[0]?.n).toBe(0);

    const priya = (await hh.get(me))?.members.find((m) => m.name === "Priya");
    const priyaAccount = await account(PRIYA);
    expect(priya).toBeDefined();
    expect(await hh.deleteAccount(priyaAccount)).toEqual({ household: false });
    expect((await hh.get(me))?.members.map((m) => m.name)).toEqual(["Mayur"]);
    expect(await hh.deleteAccount(me)).toEqual({ household: true });
    const left = (await sql`select
      (select count(*)::int from households) as h,
      (select count(*)::int from members) as m,
      (select count(*)::int from records) as r,
      (select count(*)::int from changes) as c,
      (select count(*)::int from accounts) as a`) as unknown as Record<
      string,
      number
    >[];
    expect(left[0]).toEqual({ h: 0, m: 0, r: 0, c: 0, a: 0 });
  });
});
