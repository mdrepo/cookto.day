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
import { functionRuns, type Runs } from "../src/runs.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/241, on Postgres (db/migrations/0009): what the 10 pm question
// needs. Every household with its switch, for the cron; the server's own
// writes to a household's records, by the phones' rules; a planner's
// conversation, opened from their Telegram sign-in (a private chat's id is
// the person's); and a session for a Telegram account a web app proves.

const sql = DATABASE_URL ? connect() : null;
const T0 = "2026-10-21T16:30:00.000Z";

const sha256 = async (text: string) => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const rec = (collection: string, id: string, version: number, more = {}) => ({
  collection,
  record: { id, version, updatedAt: T0, deletedAt: null, ...more },
});

describe.skipIf(sql === null)("reaching the household, on Postgres", () => {
  let auth: AuthStore;
  let hh: Households;
  let runs: Runs;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    const call = sqlCall(sql);
    auth = functionAuth(call, SECRET);
    hh = functionHouseholds(call, SECRET);
    runs = functionRuns(call, SECRET);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

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

  test("every household, with its switch", async () => {
    const me = await account({ id: "42", name: "Mayur" });
    const made = await hh.create(me, [], T0);
    if (!made.ok) throw new Error(made.reason);
    expect(await hh.list()).toEqual([{ id: made.household, botOff: false }]);
    await runs.setBotOff(me, true);
    expect(await hh.list()).toEqual([{ id: made.household, botOff: true }]);
  });

  test("the server's writes: newer kept and logged, older refused with the copy", async () => {
    const me = await account({ id: "42", name: "Mayur" });
    const made = await hh.create(
      me,
      [rec("household-settings", "household", 1, { sorted: null })],
      T0,
    );
    if (!made.ok) throw new Error(made.reason);
    const newer = rec("household-settings", "household", 2, {
      sorted: "2026-10-22",
    });
    expect(await hh.put(made.household, [newer], T0)).toEqual([]);
    const stale = rec("household-settings", "household", 2, { sorted: null });
    const refused = await hh.put(made.household, [stale], T0);
    expect(refused).toMatchObject([
      { collection: "household-settings", record: { sorted: "2026-10-22" } },
    ]);
    const page = await hh.changes(me, 0, 500);
    expect(page?.changes.map((c) => c.record.version)).toEqual([1, 2]);
  });

  test("a planner's conversation, from their Telegram sign-in", async () => {
    const me = await account({ id: "42", name: "Mayur" });
    const made = await hh.create(me, [], T0);
    if (!made.ok) throw new Error(made.reason);
    await hh.reachPlanners(made.household, "telegram", T0);
    await hh.reachPlanners(made.household, "telegram", T0);
    if (!sql) return;
    const rows = await sql<{ chat: string; owner_kind: string }[]>`
      select c.chat, c.owner_kind from members m
      join conversations c on c.id = m.conversation
      where m.household = ${made.household}`;
    expect(rows).toEqual([{ chat: "42", owner_kind: "member" }]);
    const run = await runs.create({
      id: "run00001",
      household: made.household,
      audience: "planners",
      workflow: "tomorrow",
      about: {},
      dueAt: T0,
      expiresAt: null,
      now: T0,
    });
    expect(await runs.conversations(run.id)).toHaveLength(1);
  });

  // A stranger's proof makes an account since specs/260: see
  // start-in-telegram.test.ts.
  test("a session for a Telegram account a web app proves", async () => {
    await account({ id: "42", name: "Mayur" });
    const got = await auth.sessionFor(
      "telegram",
      { id: "42", name: "Mayur" },
      T0,
    );
    expect(got.name).toBe("Mayur");
    expect(await auth.session(await sha256(got.session), T0)).toMatchObject({
      name: "Mayur",
    });
  });
});
