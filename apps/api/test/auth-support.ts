import type { AuthStore } from "@cookto/db";
import { sha256 } from "./messenger-support.js";

// Sign-in kept in memory the way db/migrations/0004 keeps it (spec #216):
// a sign-in link with its one-use code, the identity Start makes or finds,
// and sessions by hash with their last use. The API's auth tests run on
// this; db/test/auth.test.ts runs the same rules on Postgres.

const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

interface SignInLink {
  code: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  account: string | null;
  sessionIssued: boolean;
}

interface Identity {
  channel: string;
  userId: string;
  account: string;
  name: string;
}

interface Session {
  account: string;
  lastUsedAt: string;
}

export interface FakeAuth {
  auth: AuthStore;
  accounts: Set<string>;
  identities: Identity[];
  sessions: Map<string, Session>;
  links: Map<string, SignInLink>;
}

export function fakeAuth(): FakeAuth {
  const links = new Map<string, SignInLink>();
  const requests = new Map<string, number>();
  const accounts = new Set<string>();
  const identities: Identity[] = [];
  const sessions = new Map<string, Session>();
  let n = 0;
  const day = (now: string) => now.slice(0, 10);
  const byHash = (hash: string) =>
    [...links.values()].find((l) => l.tokenHash === hash);
  const auth: AuthStore = {
    makeLink: async (addressHash, now) => {
      const key = `${addressHash}:${day(now)}`;
      const asked = (requests.get(key) ?? 0) + 1;
      requests.set(key, asked);
      if (asked > 10) return { ok: false, reason: "limit" };
      n++;
      const code = `SI7Q4HT${String.fromCharCode(65 + (n % 26))}`;
      const token = `sit-${String(n)}-${"b".repeat(60)}`;
      const expiresAt = new Date(Date.parse(now) + 600_000).toISOString();
      links.set(code, {
        code,
        tokenHash: await sha256(token),
        expiresAt,
        usedAt: null,
        account: null,
        sessionIssued: false,
      });
      return { ok: true, code, token, expiresAt };
    },
    start: (code, channel, from, now) => {
      const l = links.get(code.replace("-", "").toUpperCase());
      if (!l) return Promise.resolve({ ok: false, reason: "not-sign-in" });
      if (l.usedAt !== null || l.expiresAt < now)
        return Promise.resolve({ ok: false, reason: "bad" });
      let identity = identities.find(
        (i) => i.channel === channel && i.userId === from.id,
      );
      if (!identity) {
        const account = `acct-${String(accounts.size + 1)}`;
        accounts.add(account);
        identity = { channel, userId: from.id, account, name: from.name };
        identities.push(identity);
      }
      l.usedAt = now;
      l.account = identity.account;
      return Promise.resolve({ ok: true, name: identity.name });
    },
    claim: async (tokenHash, now) => {
      const l = byHash(tokenHash);
      if (!l || l.sessionIssued) return { state: "gone" };
      if (l.usedAt === null)
        return { state: l.expiresAt < now ? "expired" : "waiting" };
      const account = l.account ?? "";
      const session = `ses-${String(sessions.size + 1)}-${"c".repeat(60)}`;
      sessions.set(await sha256(session), { account, lastUsedAt: now });
      l.sessionIssued = true;
      const name = identities.find((i) => i.account === account)?.name ?? "";
      return { state: "used", name, session };
    },
    session: (hash, now) => {
      const s = sessions.get(hash);
      if (!s) return Promise.resolve(null);
      if (Date.parse(now) - Date.parse(s.lastUsedAt) > SESSION_DAYS * DAY_MS) {
        sessions.delete(hash);
        return Promise.resolve(null);
      }
      s.lastUsedAt = now;
      const name = identities.find((i) => i.account === s.account)?.name ?? "";
      return Promise.resolve({ account: s.account, name });
    },
    end: (hash) => Promise.resolve(sessions.delete(hash)),
    // A web app the bot opened makes the account, as Start does (specs/260).
    sessionFor: async (channel, from, now) => {
      let who = identities.find(
        (i) => i.channel === channel && i.userId === from.id,
      );
      if (!who) {
        const account = `acct-${String(accounts.size + 1)}`;
        accounts.add(account);
        who = { channel, userId: from.id, account, name: from.name };
        identities.push(who);
      }
      const session = `ses-${String(sessions.size + 1)}-${"d".repeat(60)}`;
      sessions.set(await sha256(session), {
        account: who.account,
        lastUsedAt: now,
      });
      return { name: who.name, session };
    },
    accountOf: (channel, userId) =>
      Promise.resolve(
        identities.find((i) => i.channel === channel && i.userId === userId)
          ?.account ?? null,
      ),
    housekeeping: (now) => {
      let gone = 0;
      for (const [hash, s] of sessions)
        if (
          Date.parse(now) - Date.parse(s.lastUsedAt) >
          SESSION_DAYS * DAY_MS
        ) {
          sessions.delete(hash);
          gone++;
        }
      return Promise.resolve({ sessions: gone });
    },
  };
  return { auth, accounts, identities, sessions, links };
}

/** The session cookie's value from a Set-Cookie header, or null. */
export function cookieValue(response: Response): string | null {
  const header = response.headers.get("set-cookie") ?? "";
  const match = /^session=([^;]*)/.exec(header);
  return match?.[1] ?? null;
}

/** A request carrying a session cookie. */
export function withCookie(request: Request, session: string): Request {
  const headers = new Headers(request.headers);
  headers.set("cookie", `session=${session}`);
  return new Request(request, { headers });
}
