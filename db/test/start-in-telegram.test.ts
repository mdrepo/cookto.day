import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { type AuthStore, functionAuth } from "../src/auth.js";
import { allow, connect, DATABASE_URL, SECRET, sqlCall, wipe } from "./sql.js";

// specs/260, on Postgres (db/migrations/0010): the page "Set up your
// kitchen" opens makes the account of a Telegram user who has none, with
// the identity a sign-in code's Start makes, once; and the bot finds the
// account behind a Start with no code.

const sql = DATABASE_URL ? connect() : null;
const T0 = "2026-10-25T12:00:00.000Z";
const ASHA = { id: "77", name: "Asha" };

describe.skipIf(sql === null)("starting in Telegram, on Postgres", () => {
  let auth: AuthStore;
  beforeAll(async () => {
    if (!sql) return;
    await allow(sql);
    auth = functionAuth(sqlCall(sql), SECRET);
  });
  beforeEach(async () => {
    if (sql) await wipe(sql);
  });
  afterAll(async () => {
    if (sql) await sql.close();
  });

  test("a stranger's proof makes the account, once, with the identity Start makes", async () => {
    expect(await auth.accountOf("telegram", "77")).toBeNull();
    const first = await auth.sessionFor("telegram", ASHA, T0);
    expect(first.name).toBe("Asha");
    const account = await auth.accountOf("telegram", "77");
    expect(account).not.toBeNull();
    const again = await auth.sessionFor("telegram", ASHA, T0);
    expect(again.session).not.toBe(first.session);
    expect(await auth.accountOf("telegram", "77")).toBe(account);
    if (!sql) return;
    const rows = await sql<{ n: number }[]>`
      select count(*)::int as n from identities where user_id = '77'`;
    expect(rows[0]?.n).toBe(1);
  });
});
