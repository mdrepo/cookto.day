import type { Changes } from "./changes.js";
import type { KeyValue } from "./kv.js";
import { ApiError, type PushedRecord, type SyncApi } from "./network.js";
import type { RecordStore } from "./record-store.js";
import type { SyncRecord } from "./records.js";

// Sync, local first (ADR 0033, spec #217): the phone's copy stays what
// screens show. Every write through the repositories is pending until
// pushed, whole, and the newer version wins; a pull applies the changes
// after the cursor through the same store, so screens see them like any
// write. One sync runs at a time; a new one cancels the one in flight, and
// a cancelled sync changes nothing on the phone.

export const SYNC_KEY = "cookto.day:sync";
export const PUSH_PAGE = 500;
const PAUSE_MS = 2_000;

/** What each collection's change announces, as its repository does. */
export const SYNC_TOPICS: Record<string, string> = {
  cooked: "cooked",
  members: "household",
  "my-dishes-out": "my-dishes",
  pantry: "pantry",
  plans: "plans",
  shopping: "shopping",
};

export type SyncOutcome =
  "synced" | "offline" | "signed-out" | "no-household" | "cancelled" | "failed";

export interface Sync {
  /** The store the repositories write through: every save is pending. */
  store: RecordStore;
  /** Push what's pending, then pull. A sync in flight is cancelled first. */
  run(): Promise<SyncOutcome>;
  /** After a write: one sync after a short pause, however many writes. */
  soon(): void;
  /** Waits for a sync `soon` started. */
  idle(): Promise<void>;
  pending(): number;
  cursor(): number;
  /** Forget the cursor and what's pending: on leaving a household. */
  reset(): void;
}

export interface SyncOptions {
  store: RecordStore;
  api: SyncApi;
  kv: KeyValue;
  changes: Changes;
  pauseMs?: number;
  /** Runs `fn` after `ms`; returns how to cancel. The app passes setTimeout. */
  schedule?: (fn: () => void, ms: number) => () => void;
}

type Stored = SyncRecord & Record<string, unknown>;
interface Pending {
  collection: string;
  id: string;
}

const CANCELLED = new Error("cancelled");
/** Stops a sync that was cancelled while it waited on the store or the API. */
function check(signal: AbortSignal): void {
  if (signal.aborted) throw CANCELLED;
}
const key = (collection: string, id: string) => `${collection}/${id}`;
const timeout = (fn: () => void, ms: number) => {
  const timer = setTimeout(fn, ms);
  return () => {
    clearTimeout(timer);
  };
};

/** What a failed sync comes to, by the API's answer. */
function outcomeOf(error: unknown): SyncOutcome {
  if (!(error instanceof ApiError)) return "failed";
  if (error.status === 0) return "offline";
  if (error.status === 401) return "signed-out";
  if (error.status === 403) return "no-household";
  return "failed";
}

/** The cursor and what's pending, as saved between runs of the app. */
function readState(kv: KeyValue): { cursor: number; pending: Pending[] } {
  try {
    const v = JSON.parse(kv.get(SYNC_KEY) ?? "null") as {
      cursor?: unknown;
      pending?: unknown;
    } | null;
    const cursor = typeof v?.cursor === "number" ? v.cursor : 0;
    const pending = Array.isArray(v?.pending)
      ? (v.pending as unknown[]).flatMap((p) =>
          Array.isArray(p) &&
          typeof p[0] === "string" &&
          typeof p[1] === "string"
            ? [{ collection: p[0], id: p[1] }]
            : [],
        )
      : [];
    return { cursor, pending };
  } catch {
    return { cursor: 0, pending: [] };
  }
}

class Syncer implements Sync {
  readonly store: RecordStore;
  private at: number;
  private readonly queue = new Map<string, Pending>();
  private current: AbortController | null = null;
  private cancelTimer: (() => void) | null = null;
  private running: Promise<unknown> = Promise.resolve();

  constructor(private readonly o: SyncOptions) {
    const state = readState(o.kv);
    this.at = state.cursor;
    for (const p of state.pending) this.queue.set(key(p.collection, p.id), p);
    const raw = o.store;
    this.store = {
      get: (collection, id, signal) => raw.get(collection, id, signal),
      all: (collection, signal) => raw.all(collection, signal),
      put: async (collection, records) => {
        await raw.put(collection, records);
        for (const r of records)
          this.queue.set(key(collection, r.id), { collection, id: r.id });
        this.persist();
      },
    };
  }

  pending = () => this.queue.size;
  cursor = () => this.at;

  reset(): void {
    this.at = 0;
    this.queue.clear();
    this.persist();
  }

  soon(): void {
    this.cancelTimer?.();
    this.cancelTimer = (this.o.schedule ?? timeout)(() => {
      this.cancelTimer = null;
      this.running = this.run();
    }, this.o.pauseMs ?? PAUSE_MS);
  }

  async idle(): Promise<void> {
    await this.running;
  }

  async run(): Promise<SyncOutcome> {
    this.current?.abort();
    const controller = new AbortController();
    this.current = controller;
    const touched = new Set<string>();
    try {
      await this.push(controller.signal, touched);
      await this.pull(controller.signal, touched);
      return "synced";
    } catch (error) {
      return controller.signal.aborted ? "cancelled" : outcomeOf(error);
    } finally {
      for (const topic of touched) this.o.changes.announce(topic);
      if (this.current === controller) this.current = null;
    }
  }

  private persist(): void {
    try {
      this.o.kv.set(
        SYNC_KEY,
        JSON.stringify({
          cursor: this.at,
          pending: [...this.queue.values()].map((p) => [p.collection, p.id]),
        }),
      );
    } catch {
      // Not remembered; the next run of the app pulls everything again.
    }
  }

  /** The server's copy of a record lands if it's newer than the phone's. */
  private async apply(
    r: PushedRecord,
    signal: AbortSignal,
    touched: Set<string>,
  ): Promise<void> {
    const local = await this.o.store.get<Stored>(r.collection, r.record.id);
    check(signal);
    if (local && local.version >= r.record.version) return;
    await this.o.store.put(r.collection, [r.record]);
    this.queue.delete(key(r.collection, r.record.id));
    touched.add(SYNC_TOPICS[r.collection] ?? r.collection);
  }

  /** What's pending, read whole from the store. */
  private async gather(signal: AbortSignal): Promise<PushedRecord[]> {
    const records: PushedRecord[] = [];
    for (const p of [...this.queue.values()]) {
      const record = await this.o.store.get<Stored>(p.collection, p.id);
      check(signal);
      if (record) records.push({ collection: p.collection, record });
      else this.queue.delete(key(p.collection, p.id));
    }
    return records;
  }

  private async push(signal: AbortSignal, touched: Set<string>) {
    const records = await this.gather(signal);
    for (let i = 0; i < records.length; i += PUSH_PAGE) {
      const page = records.slice(i, i + PUSH_PAGE);
      const { refused } = await this.o.api.push(page);
      check(signal);
      for (const sent of page) {
        const now = await this.o.store.get<Stored>(
          sent.collection,
          sent.record.id,
        );
        check(signal);
        // A write during the push bumped the version: it stays pending.
        if (now && now.version === sent.record.version)
          this.queue.delete(key(sent.collection, sent.record.id));
      }
      for (const r of refused) await this.apply(r, signal, touched);
      this.persist();
    }
  }

  private async pull(signal: AbortSignal, touched: Set<string>) {
    for (let more = true; more;) {
      const page = await this.o.api.changes(this.at);
      check(signal);
      for (const c of page.changes)
        await this.apply(
          { collection: c.collection, record: c.record },
          signal,
          touched,
        );
      this.at = page.cursor;
      more = page.more;
      this.persist();
    }
  }
}

export function createSync(o: SyncOptions): Sync {
  return new Syncer(o);
}
