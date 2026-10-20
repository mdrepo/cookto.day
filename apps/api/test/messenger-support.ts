import type { Links } from "@cookto/db";
import {
  createMessenger,
  type FakeChannel,
  fakeChannel,
  memoryStore,
  type Store,
} from "@cookto/messenger";
import type { LogEntry } from "../src/log.js";
import type { MessengerDeps } from "../src/messenger/deps.js";

// What the messenger's route tests share (spec #207): the package's fake
// channel and memory store, and links kept in memory the way the database's
// functions keep them (db/migrations/0003), so the routes are tested whole.

export const T0 = "2026-10-20T19:00:00.000Z";
export const ORIGIN = "https://cookto.day";

/** sha256, hex, as the API hashes a token. */
export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Link {
  code: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  conversation: string | null;
  sendsOn: string;
  sends: number;
}

/** Links in memory: the same rules as db/migrations/0003. */
export function fakeLinks(store: Store) {
  const links = new Map<string, Link>();
  const requests = new Map<string, number>();
  let n = 0;
  const day = (now: string) => now.slice(0, 10);
  const byHash = (hash: string) =>
    [...links.values()].find((l) => l.tokenHash === hash);
  const api: Links = {
    make: async (addressHash, now) => {
      const key = `${addressHash}:${day(now)}`;
      const asked = (requests.get(key) ?? 0) + 1;
      requests.set(key, asked);
      if (asked > 10) return { ok: false, reason: "limit" };
      n++;
      const code = `KM7Q4HT${String.fromCharCode(65 + (n % 26))}`;
      const token = `tok-${String(n)}-${"a".repeat(60)}`;
      const expiresAt = new Date(Date.parse(now) + 600_000).toISOString();
      links.set(code, {
        code,
        tokenHash: await sha256(token),
        expiresAt,
        usedAt: null,
        conversation: null,
        sendsOn: "",
        sends: 0,
      });
      return { ok: true, code, token, expiresAt };
    },
    connect: async (code, channel, chat, now) => {
      const l = links.get(code.replace("-", "").toUpperCase());
      if (!l || l.usedAt !== null || l.expiresAt < now) return { ok: false };
      const c = await store.open(
        channel,
        chat,
        { kind: "link", id: l.tokenHash },
        now,
      );
      l.usedAt = now;
      l.conversation = c.id;
      return { ok: true, conversation: c };
    },
    status: async (hash, now) => {
      const l = byHash(hash);
      if (!l) return { state: "gone" };
      if (l.conversation !== null) {
        const c = await store.get(l.conversation);
        return c ? { state: "connected", conversation: c } : { state: "gone" };
      }
      if (l.usedAt !== null) return { state: "gone" };
      if (l.expiresAt < now) return { state: "expired" };
      return { state: "waiting" };
    },
    remove: async (hash) => {
      const l = byHash(hash);
      if (!l) return false;
      if (l.conversation !== null) await store.remove(l.conversation);
      links.delete(l.code);
      return true;
    },
    sendAllowed: (hash, now) => {
      const l = byHash(hash);
      if (!l?.conversation)
        return Promise.resolve({ ok: false, reason: "gone" });
      if (l.sendsOn !== day(now)) {
        l.sendsOn = day(now);
        l.sends = 0;
      }
      if (l.sends >= 20) return Promise.resolve({ ok: false, reason: "limit" });
      l.sends++;
      return Promise.resolve({ ok: true, conversation: l.conversation });
    },
    housekeeping: async (now) => {
      const before = new Date(Date.parse(now) - 90 * 86_400_000).toISOString();
      const messages = await store.purge(before);
      return { messages, updates: 0, links: 0 };
    },
  };
  return { links: api, rows: links };
}

export interface Harness {
  deps: MessengerDeps;
  channel: FakeChannel;
  store: Store;
  logged: LogEntry[];
  /** Work handed to `after`, awaited by the test. */
  settle: () => Promise<void>;
  clock: { now: number };
}

export function harness(start = T0): Harness {
  const channel = fakeChannel();
  const store = memoryStore();
  const clock = { now: Date.parse(start) };
  const messenger = createMessenger({
    channel,
    store,
    now: () => new Date(clock.now).toISOString(),
  });
  const pending: Promise<unknown>[] = [];
  const logged: LogEntry[] = [];
  const deps: MessengerDeps = {
    messenger,
    links: fakeLinks(store).links,
    addressSecret: "address-secret-for-tests",
    after: (work) => {
      pending.push(work);
    },
    log: (entry) => {
      logged.push(entry);
    },
    now: () => clock.now,
  };
  return {
    deps,
    channel,
    store,
    logged,
    clock,
    settle: async () => {
      while (pending.length > 0) await pending.shift();
    },
  };
}

/** A request to the messenger's routes, with a token when given. */
export function ask(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Request {
  const headers: Record<string, string> = { "cf-connecting-ip": "203.0.113.7" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token !== undefined) headers.authorization = `Bearer ${token}`;
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}
