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
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/240, on Postgres: the server reads one collection of a household's
// records, by household, for its schedule (db/migrations/0008). Deleted
// records come too, marked, as the phones keep them; another household's
// never do.

const sql = DATABASE_URL ? connect() : null;
const T0 = "2026-10-20T19:00:00.000Z";

const sha256 = async (text: string) => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const rec = (collection: string, id: string, more = {}) => ({
  collection,
  record: { id, version: 1, updatedAt: T0, deletedAt: null, ...more },
});

describe.skipIf(sql === null)("a household's records, on Postgres", () => {
  let auth: AuthStore;
  let hh: Households;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    const call = sqlCall(sql);
    auth = functionAuth(call, SECRET);
    hh = functionHouseholds(call, SECRET);
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

  test("one collection, whole, in id order; nobody else's", async () => {
    const me = await account({ id: "42", name: "Mayur" });
    const other = await account({ id: "7", name: "Priya" });
    const made = await hh.create(
      me,
      [
        rec("members", "m-2", { kind: "adult", meals: ["dinner"] }),
        rec("members", "m-1", { kind: "adult", deletedAt: T0 }),
        rec("household-settings", "household", { timeZone: "Asia/Kolkata" }),
      ],
      T0,
    );
    if (!made.ok) throw new Error(made.reason);
    await hh.create(other, [rec("members", "m-9")], T0);

    const members = await hh.records(made.household, "members");
    expect(members.map((r) => r.id)).toEqual(["m-1", "m-2"]);
    expect(members[0]?.deletedAt).toBe(T0);
    expect(members[1]).toMatchObject({ kind: "adult", meals: ["dinner"] });
    expect(
      await hh.records(made.household, "household-settings"),
    ).toMatchObject([{ id: "household", timeZone: "Asia/Kolkata" }]);
    expect(await hh.records(made.household, "plans")).toEqual([]);
  });
});
