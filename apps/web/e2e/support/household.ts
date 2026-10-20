import type { Page } from "@playwright/test";

// The household and sync, as the browser tests play them (specs/217): one
// server in the test, shared by every phone (page) it fakes the API for.
// Records whole at their version, newer wins, a changes log, members,
// invites, and sessions as cookies, the API's own rules.

interface Stored {
  collection: string;
  record: { id: string; version: number; [k: string]: unknown };
}

interface Member {
  id: string;
  role: "plan" | "cook";
  kind: "account" | "telegram";
  name: string | null;
  stopped: boolean;
  account: string | null;
}

export interface HouseholdServer {
  records: Map<string, Stored>;
  log: { seq: number; collection: string; record: Stored["record"] }[];
  members: Member[];
  /** The account a session cookie stands for. */
  sessions: Map<string, string>;
  /** Accounts in the household, by name. */
  inHousehold: Set<string>;
  created: { records: Stored[]; cookToken?: string }[];
  asked: string[];
  codes: Map<string, { kind: "sign-in" | "plan" | "cook"; by: string | null }>;
  /** Start pressed in the bot for a code, by this person. */
  start: (code: string, name: string) => void;
  /** Another phone's change, straight on the server. */
  put: (collection: string, record: Stored["record"]) => void;
  recordsOf: (collection: string) => Stored["record"][];
  /** The next member id. */
  next: () => string;
}

export function householdServer(): HouseholdServer {
  let seq = 0;
  let n = 0;
  const s: HouseholdServer = {
    records: new Map(),
    log: [],
    members: [],
    sessions: new Map(),
    inHousehold: new Set(),
    created: [],
    asked: [],
    codes: new Map(),
    start: (code, name) => {
      const c = s.codes.get(code);
      if (!c) return;
      c.by = name;
      if (c.kind === "plan") {
        s.inHousehold.add(name);
        s.members.push({
          id: `m-${String(++n)}`,
          role: "plan",
          kind: "account",
          name,
          stopped: false,
          account: name,
        });
      }
      if (c.kind === "cook")
        s.members.push({
          id: `m-${String(++n)}`,
          role: "cook",
          kind: "telegram",
          name: null,
          stopped: false,
          account: null,
        });
    },
    put: (collection, record) => {
      s.records.set(`${collection}/${record.id}`, { collection, record });
      s.log.push({ seq: ++seq, collection, record });
    },
    next: () => `m-${String(++n)}`,
    recordsOf: (collection) =>
      [...s.records.values()]
        .filter((r) => r.collection === collection)
        .map((r) => r.record),
  };
  return s;
}

/** The API faked for one phone, against the shared server. */
export async function fakeHouseholdApi(page: Page, s: HouseholdServer) {
  const state = { down: false };
  let codes = 0;
  const who = (cookie: string | undefined) => {
    const m = /session=([^;]+)/.exec(cookie ?? "");
    return m ? (s.sessions.get(m[1] ?? "") ?? null) : null;
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const account = who(request.headers().cookie);
    const json = (status: number, body: unknown, headers = {}) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers,
        body: JSON.stringify(body),
      });
    if (state.down) {
      await route.abort("failed");
      return;
    }
    s.asked.push(`${method} ${path}`);
    // Sign-in (specs/216), as the bot and the API would answer.
    if (method === "POST" && path === "/api/auth/links") {
      const code = `SIGN${String(++codes).padStart(4, "2")}`;
      s.codes.set(code, { kind: "sign-in", by: null });
      await json(201, { code, token: `t-${code}`, expiresAt: "2099-01-01" });
      return;
    }
    if (method === "GET" && path.startsWith("/api/auth/links/")) {
      const code = path.split("/").pop() ?? "";
      const c = s.codes.get(code);
      if (c?.by) {
        const session = `s-${c.by}-${String(codes)}`;
        s.sessions.set(session, c.by);
        await json(
          200,
          { used: true, name: c.by },
          { "set-cookie": `session=${session}; Path=/api; SameSite=Strict` },
        );
      } else await json(200, { used: false, state: "waiting" });
      return;
    }
    if (method === "GET" && path === "/api/auth/me") {
      if (account) await json(200, { name: account });
      else await json(401, { error: "session" });
      return;
    }
    if (method === "DELETE" && path === "/api/auth/session") {
      await route.fulfill({ status: 204 });
      return;
    }
    if (account === null) {
      await json(401, { error: "session" });
      return;
    }
    const member = s.inHousehold.has(account);
    if (method === "POST" && path === "/api/household") {
      const body = request.postDataJSON() as {
        records: Stored[];
        cookToken?: string;
      };
      s.created.push(body);
      s.inHousehold.add(account);
      s.members.push({
        id: s.next(),
        role: "plan",
        kind: "account",
        name: account,
        stopped: false,
        account,
      });
      for (const r of body.records) s.put(r.collection, r.record);
      await json(201, { id: "home-1" });
      return;
    }
    if (!member) {
      await json(path === "/api/household" ? 404 : 403, {
        error: "no-household",
      });
      return;
    }
    if (method === "GET" && path === "/api/household") {
      await json(200, {
        id: "home-1",
        members: s.members.map((m) => ({
          id: m.id,
          role: m.role,
          kind: m.kind,
          name: m.name,
          stopped: m.stopped,
        })),
      });
      return;
    }
    if (method === "POST" && path === "/api/household/links") {
      const { role } = request.postDataJSON() as { role: "plan" | "cook" };
      const code = `JOIN${String(++codes).padStart(4, "2")}`;
      s.codes.set(code, { kind: role, by: null });
      await json(201, { code, expiresAt: "2099-01-01" });
      return;
    }
    if (method === "DELETE" && path.startsWith("/api/household/members/")) {
      const id = path.split("/").pop();
      const gone = s.members.find((m) => m.id === id);
      s.members = s.members.filter((m) => m.id !== id);
      if (gone?.account) s.inHousehold.delete(gone.account);
      await route.fulfill({ status: 204 });
      return;
    }
    if (method === "DELETE" && path === "/api/account") {
      s.members = s.members.filter((m) => m.account !== account);
      s.inHousehold.delete(account);
      for (const [k, v] of s.sessions) if (v === account) s.sessions.delete(k);
      await route.fulfill({ status: 204 });
      return;
    }
    if (method === "POST" && path === "/api/sync/push") {
      const { records } = request.postDataJSON() as { records: Stored[] };
      const refused: Stored[] = [];
      for (const r of records) {
        const have = s.records.get(`${r.collection}/${r.record.id}`);
        if (have && have.record.version >= r.record.version) refused.push(have);
        else s.put(r.collection, r.record);
      }
      await json(200, { refused });
      return;
    }
    if (method === "GET" && path === "/api/sync/changes") {
      const after = Number(url.searchParams.get("after") ?? "0");
      const changes = s.log.filter((c) => c.seq > after);
      await json(200, {
        changes,
        cursor: changes.at(-1)?.seq ?? after,
        more: false,
        reset: false,
      });
      return;
    }
    await json(404, { error: "not-found" });
  });
  return state;
}

/** Signs this phone in as `name` through Settings, pressing Start in the bot. */
export async function signIn(page: Page, s: HouseholdServer, name: string) {
  await page
    .getByRole("button", { name: "Continue with Telegram", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const code =
    (
      await page.getByRole("status", { name: "Account" }).textContent()
    )?.replace("-", "") ?? "";
  s.start(code, name);
  await page.getByText(`Signed in as ${name}`).waitFor({ timeout: 10_000 });
}

export const household = (page: Page) =>
  page.getByRole("region", { name: "Household" });

/** Tomorrow's dinner pick, where another phone's change shows. */
export const tomorrowDinner = (page: Page) =>
  page
    .getByRole("region", { name: "Tomorrow" })
    .getByRole("article", { name: "Dinner" });
