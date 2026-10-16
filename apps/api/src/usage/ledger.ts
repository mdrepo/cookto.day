import { LIMITS, type Limit } from "./limits.js";
import type { Ticket, Verdict, Who } from "./usage.js";

// The counts behind ADR 0028's limits, in SQLite. Synchronous on purpose: in
// a Durable Object, code with no `await` runs to the end before any other
// request is let in, so checking and counting can't be split by another read.

export type SqlValue = string | number | null;

/** Runs one statement and returns its rows (a Durable Object's storage.sql). */
export interface Sql {
  exec(query: string, ...values: SqlValue[]): unknown[];
}

/** Runs `work` all or nothing. */
export type Transaction = <T>(work: () => T) => T;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS counts (key TEXT PRIMARY KEY, expires TEXT NOT NULL, n INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS counts_expires ON counts (expires)",
  "CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, keys TEXT NOT NULL, expires TEXT NOT NULL)",
];

const day = (at: Date) => at.toISOString().slice(0, 10);
const month = (at: Date) => at.toISOString().slice(0, 7);
const tomorrow = (at: Date) =>
  day(
    new Date(
      Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1),
    ),
  );
const nextMonth = (at: Date) =>
  day(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1)));

interface Counter {
  limit: Limit;
  /** limit|subject|period, so a new day or month starts a new row. */
  key: string;
  /** The first day it no longer counts: YYYY-MM-DD, UTC. */
  expires: string;
}

function counters(who: Who, at: Date): Counter[] {
  return LIMITS.map((limit) => {
    const subject = limit.per === "everyone" ? "all" : who[limit.per];
    const daily = limit.period === "day";
    return {
      limit,
      key: `${limit.name}|${subject}|${daily ? day(at) : month(at)}`,
      expires: daily ? tomorrow(at) : nextMonth(at),
    };
  });
}

export class Ledger {
  constructor(
    private readonly sql: Sql,
    private readonly transaction: Transaction,
  ) {
    for (const statement of SCHEMA) sql.exec(statement);
  }

  /** Counts one read against every limit, or, if any is reached, none. */
  take(who: Who, at: Date): Verdict {
    return this.transaction((): Verdict => {
      this.sql.exec("DELETE FROM counts WHERE expires <= ?", day(at));
      this.sql.exec("DELETE FROM tickets WHERE expires <= ?", day(at));
      const all = counters(who, at);
      const reached = all.find((c) => this.count(c.key) >= c.limit.max);
      if (reached)
        return {
          ok: false,
          limit: reached.limit.name,
          resetsAt: `${reached.expires}T00:00:00Z`,
        };
      for (const c of all)
        this.sql.exec(
          "INSERT INTO counts (key, expires, n) VALUES (?, ?, 1) ON CONFLICT (key) DO UPDATE SET n = n + 1",
          c.key,
          c.expires,
        );
      const id = crypto.randomUUID();
      const keys = JSON.stringify(all.map((c) => c.key));
      this.sql.exec(
        "INSERT INTO tickets (id, keys, expires) VALUES (?, ?, ?)",
        id,
        keys,
        tomorrow(at),
      );
      return { ok: true, ticket: { id } };
    });
  }

  /** Uncounts a read, once: giving the same ticket back again does nothing. */
  giveBack(ticket: Ticket): void {
    this.transaction(() => {
      const row = this.sql.exec(
        "DELETE FROM tickets WHERE id = ? RETURNING keys",
        ticket.id,
      )[0] as { keys: string } | undefined;
      if (!row) return;
      for (const key of JSON.parse(row.keys) as string[])
        this.sql.exec(
          "UPDATE counts SET n = n - 1 WHERE key = ? AND n > 0",
          key,
        );
    });
  }

  private count(key: string): number {
    const row = this.sql.exec("SELECT n FROM counts WHERE key = ?", key)[0] as
      { n: number } | undefined;
    return row?.n ?? 0;
  }
}
