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

// specs/270, on Postgres (db/migrations/0011): who's in a household for the
// bot's words, each with a first name: a planner's from their sign-in, the
// cook's from Telegram, kept when they join or at their next tap.

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

describe.skipIf(sql === null)("the household's names, on Postgres", () => {
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

  async function planner() {
    const from = { id: "42", name: "Mayur" };
    const link = await auth.makeLink("addr-42", T0);
    if (!link.ok) throw new Error("no link");
    await auth.start(link.code, "telegram", from, T0);
    const claimed = await auth.claim(await sha256(link.token), T0);
    if (claimed.state !== "used") throw new Error(claimed.state);
    const session = await auth.session(await sha256(claimed.session), T0);
    if (!session) throw new Error("no session");
    const made = await hh.create(session.account, [], T0);
    if (!made.ok) throw new Error(made.reason);
    return { account: session.account, household: made.household };
  }

  async function cook(
    account: string,
    from: { id: string; name: string } | null,
  ) {
    const inv = await hh.invite(account, "cook", "addr-cook", T0);
    if (!inv.ok) throw new Error("no invite");
    const started = await hh.startInvite(
      inv.code,
      "telegram",
      "c-77",
      from,
      T0,
    );
    if (!started.ok || started.role !== "cook") throw new Error("not a cook");
    return started.conversation;
  }

  test("a cook who joins with a Telegram name is named, beside the planner", async () => {
    const { account, household } = await planner();
    const conversation = await cook(account, { id: "77", name: "Sunita" });
    const people = await hh.people(household);
    expect(people.map(({ role, name }) => ({ role, name }))).toEqual([
      { role: "plan", name: "Mayur" },
      { role: "cook", name: "Sunita" },
    ]);
    expect(people.find((p) => p.role === "cook")?.conversation).toBe(
      conversation.id,
    );
    const view = await hh.get(account);
    expect(view?.members.find((m) => m.role === "cook")?.name).toBe("Sunita");
  });

  test("a cook who joined without one is named at their next tap; a planner never is", async () => {
    const { account, household } = await planner();
    await cook(account, null);
    const before = await hh.people(household);
    const theCook = before.find((p) => p.role === "cook");
    const thePlanner = before.find((p) => p.role === "plan");
    expect(theCook?.name).toBeNull();
    await hh.nameCook(theCook?.id ?? "", "Sunita");
    await hh.nameCook(thePlanner?.id ?? "", "Someone");
    const after = await hh.people(household);
    expect(after.map((p) => p.name)).toEqual(["Mayur", "Sunita"]);
  });
});
