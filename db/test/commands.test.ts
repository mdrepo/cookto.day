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

// specs/270, on Postgres (db/migrations/0012): a command comes from a chat
// whose member the bot knows; whose household it is, and the member's role,
// decide what the command does. A member that isn't there is no one's.

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

describe.skipIf(sql === null)("whose member, on Postgres", () => {
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

  test("a planner's and a cook's household and role; nobody's for a stranger", async () => {
    const link = await auth.makeLink("addr-42", T0);
    if (!link.ok) throw new Error("no link");
    await auth.start(link.code, "telegram", { id: "42", name: "Mayur" }, T0);
    const claimed = await auth.claim(await sha256(link.token), T0);
    if (claimed.state !== "used") throw new Error(claimed.state);
    const session = await auth.session(await sha256(claimed.session), T0);
    if (!session) throw new Error("no session");
    const made = await hh.create(session.account, [], T0);
    if (!made.ok) throw new Error(made.reason);
    const inv = await hh.invite(session.account, "cook", "addr-cook", T0);
    if (!inv.ok) throw new Error("no invite");
    await hh.startInvite(inv.code, "telegram", "c-77", null, T0);
    const people = await hh.people(made.household);
    for (const p of people)
      expect(await hh.whose(p.id)).toEqual({
        household: made.household,
        role: p.role,
      });
    expect(await hh.whose("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
