import { Database } from "bun:sqlite";
import type { Auth } from "../src/auth.js";
import type { Photo, Reader, ReaderResult } from "../src/receipts/reader.js";
import { Ledger } from "../src/usage/ledger.js";
import type { Strikes, Usage } from "../src/usage/usage.js";

// What the API's tests share. The counters run for real, on SQLite: Bun's
// stands in for the Durable Object's, which speaks the same SQL. Only the
// services at the edge, sign-in and the AI, are faked.

export const ORIGIN = "https://cookto.day";
export const ADDRESS = "203.0.113.7";

/** A Ledger on a fresh in-memory SQLite, and a clock the test moves. */
export function ledger(start = "2026-10-16T09:00:00Z") {
  const db = new Database(":memory:");
  const clock = { now: new Date(start) };
  const counts = new Ledger(
    { exec: (query, ...values) => db.query(query).all(...values) },
    (work) => db.transaction(work)(),
  );
  const usage: Usage = {
    take: (who) => Promise.resolve(counts.take(who, clock.now)),
    giveBack: (ticket) => {
      counts.giveBack(ticket);
      return Promise.resolve();
    },
  };
  const strikes: Strikes = {
    strike: (ticket) => {
      counts.strike(ticket);
      return Promise.resolve();
    },
  };
  /** Every count held, added up. */
  const counted = () =>
    (
      db.query("SELECT COALESCE(SUM(n), 0) AS n FROM counts").get() as {
        n: number;
      }
    ).n;
  return { counts, usage, strikes, clock, db, counted };
}

export const signedIn: Auth = {
  session: () => Promise.resolve({ account: "acct-1", household: "home-1" }),
};
export const signedOut: Auth = { session: () => Promise.resolve(null) };

/** A fake AI that answers the same each time, and remembers what it saw. */
export function fakeReader(result: ReaderResult) {
  const seen: Photo[] = [];
  const reader: Reader = {
    read: (photo) => {
      seen.push(photo);
      return Promise.resolve(result);
    },
  };
  return { reader, seen };
}

/** The first bytes that make a file a JPEG, a WebP or a PNG. */
export function jpeg(size = 2_000): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
}
export function webp(size = 2_000): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  return bytes;
}
export function png(size = 2_000): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return bytes;
}

/** A photo sent from our page, from one network address. */
export function post(
  body: BodyInit,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}/api/receipts/read`, {
    method: "POST",
    body,
    headers: {
      origin: ORIGIN,
      "content-type": "image/jpeg",
      "cf-connecting-ip": ADDRESS,
      ...headers,
    },
  });
}

/** What the AI said about the GK Minimart receipt, in rows, on 17 Oct. */
export const MINIMART = {
  shop: "GK MINIMART",
  date: "2026-10-07",
  subtotal: 38.72,
  lines: [
    "VAIGAI DOSABATTER|1||3.90",
    "FRESH PANEER 200GM|2||8.80",
    "PALAK|0.41|9.50|3.90",
    "GREEN CHILLI PADI|0.14|9.80|1.37",
    "CORIANDER|0.12|18.00|2.16",
    "BIG ONION|1.42|2.30|3.27",
    "REDCARROT|0.75|2.40|1.80",
    "LADIES FINGER|0.67|6.80|4.56",
    "BLACK BRINJAL|0.58|5.60|3.25",
    "CUCUMBER|0.83|2.70|2.24",
    "TOMATO|2.17|1.60|3.47",
  ],
};
