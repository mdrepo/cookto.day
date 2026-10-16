import type { LimitName } from "./limits.js";

// Counting AI reads against the limits (ADR 0028). The Durable Object in
// durable.ts is the real one; the tests use the same Ledger on Bun's SQLite.

export interface Who {
  household: string;
  /** The network address the request came from; the counter keeps only a hash. */
  address: string;
}

/** A read that was counted, so it can be given back if the AI fails. */
export interface Ticket {
  id: string;
}

export type Verdict =
  | { ok: true; ticket: Ticket }
  | { ok: false; limit: LimitName; resetsAt: string };

export interface Usage {
  take(who: Who): Promise<Verdict>;
  giveBack(ticket: Ticket): Promise<void>;
}
