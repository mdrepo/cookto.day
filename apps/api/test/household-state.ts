import type {
  Change,
  HouseholdView,
  MemberRow,
  PushedRecord,
} from "@cookto/db";
import type { FakeAuth } from "./auth-support.js";

// The rows behind the household fake (spec #217), kept the way migration
// 0005 keeps them: households, members, records whole at their version,
// and a changes log with one sequence. household-support.ts is the
// `Households` interface over this.

export const CHANGES_KEEP_DAYS = 90;
const DAY_MS = 86_400_000;

export interface Household {
  id: string;
  sendsOn: string;
  sends: number;
  purgedThrough: number;
  /** Its bot switched off by a planner (migration 0007). */
  botOff?: boolean;
}

export interface Member {
  id: string;
  household: string;
  account: string | null;
  chat: string | null;
  conversation: string | null;
  role: "plan" | "cook";
  /** The cook's first name from Telegram (migration 0011). */
  name?: string | null;
}

export interface StoredRecord {
  household: string;
  collection: string;
  id: string;
  record: PushedRecord["record"];
}

export interface Invite {
  code: string;
  household: string;
  role: "plan" | "cook";
  expiresAt: string;
  usedAt: string | null;
}

export class HouseholdState {
  readonly rows = new Map<string, Household>();
  readonly members: Member[] = [];
  readonly records: StoredRecord[] = [];
  readonly changes: (Change & { household: string })[] = [];
  readonly invites = new Map<string, Invite>();
  seq = 0;
  n = 0;

  constructor(readonly auth: FakeAuth) {}

  next(prefix: string): string {
    return `${prefix}-${String(++this.n)}`;
  }

  /** The member row this account has, if any. */
  of(account: string): Member | null {
    return this.members.find((m) => m.account === account) ?? null;
  }

  nameOf(account: string | null): string | null {
    if (account === null) return null;
    return (
      this.auth.identities.find((i) => i.account === account)?.name ?? null
    );
  }

  /** Records pushed: the newer version is kept and logged; the rest refused. */
  take(household: string, pushed: PushedRecord[], now: string): PushedRecord[] {
    const refused: PushedRecord[] = [];
    for (const p of pushed) {
      const have = this.records.find(
        (r) =>
          r.household === household &&
          r.collection === p.collection &&
          r.id === p.record.id,
      );
      if (have && have.record.version >= p.record.version) {
        refused.push({ collection: have.collection, record: have.record });
        continue;
      }
      if (have) have.record = p.record;
      else
        this.records.push({
          household,
          collection: p.collection,
          id: p.record.id,
          record: p.record,
        });
      this.seq++;
      this.changes.push({
        household,
        seq: this.seq,
        collection: p.collection,
        record: p.record,
        at: now,
      });
    }
    return refused;
  }

  view(household: string): HouseholdView {
    const list: MemberRow[] = this.members
      .filter((m) => m.household === household)
      .map((m) => ({
        id: m.id,
        role: m.role,
        kind: m.account === null ? "telegram" : "account",
        name: m.name ?? this.nameOf(m.account),
        stopped: m.account === null && m.conversation === null,
      }));
    return { id: household, members: list };
  }

  /** A page of changes after a cursor, or everything when the cursor is stale. */
  page(household: string, after: number, limit: number) {
    const h = this.rows.get(household);
    if (h && after < h.purgedThrough) {
      const all = this.records
        .filter((r) => r.household === household)
        .map((r) => ({
          seq: this.seq,
          collection: r.collection,
          record: r.record,
          at: "",
        }));
      return { changes: all, cursor: this.seq, more: false, reset: true };
    }
    const mine = this.changes.filter(
      (c) => c.household === household && c.seq > after,
    );
    const page = mine.slice(0, limit).map((c) => ({
      seq: c.seq,
      collection: c.collection,
      record: c.record,
      at: c.at,
    }));
    return {
      changes: page,
      cursor: page.at(-1)?.seq ?? after,
      more: mine.length > limit,
      reset: false,
    };
  }

  /** Changes older than 90 days go; each household remembers how far. */
  purge(now: string): number {
    const before = Date.parse(now) - CHANGES_KEEP_DAYS * DAY_MS;
    let gone = 0;
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const c = this.changes[i];
      if (!c || Date.parse(c.at) >= before) continue;
      const h = this.rows.get(c.household);
      if (h) h.purgedThrough = Math.max(h.purgedThrough, c.seq);
      this.changes.splice(i, 1);
      gone++;
    }
    return gone;
  }

  /** Everything of a household, gone. */
  drop(household: string): void {
    this.rows.delete(household);
    for (const list of [this.members, this.records, this.changes] as {
      household: string;
    }[][])
      for (let i = list.length - 1; i >= 0; i--)
        if (list[i]?.household === household) list.splice(i, 1);
  }
}
