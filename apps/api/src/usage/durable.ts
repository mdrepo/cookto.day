import { DurableObject } from "cloudflare:workers";
import { addressKey } from "./address.js";
import { Ledger } from "./ledger.js";
import type { Ticket, Verdict, Who } from "./usage.js";

// ADR 0028: one Durable Object counts every AI read, for everyone. One place
// keeps the counts exact; 2,000 reads a day is far below what one handles.
// Its SQLite storage is its own: nothing else reads it.

const randomSecret = () =>
  [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export class UsageCounter extends DurableObject {
  private readonly ledger: Ledger;
  /** Made here on first use, for hashing addresses; it never leaves. */
  private readonly secret: string;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    this.ledger = new Ledger(
      { exec: (query, ...values) => sql.exec(query, ...values).toArray() },
      (work) => ctx.storage.transactionSync(work),
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS secret (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL)",
    );
    sql.exec(
      "INSERT OR IGNORE INTO secret (id, value) VALUES (1, ?)",
      randomSecret(),
    );
    this.secret = sql
      .exec<{ value: string }>("SELECT value FROM secret")
      .one().value;
  }

  async take(who: Who): Promise<Verdict> {
    // Hashing awaits, so it comes first; the count after it doesn't.
    const address = await addressKey(this.secret, who.address);
    return this.ledger.take({ household: who.household, address }, new Date());
  }

  giveBack(ticket: Ticket): void {
    this.ledger.giveBack(ticket);
  }

  strike(ticket: Ticket): void {
    this.ledger.strike(ticket);
  }
}
