import {
  type Conversation,
  type Due,
  mayAdvance,
  type Owner,
  type Row,
  type Status,
  type Store,
} from "./store.js";

// The store in memory: what the tests and the app's browser fakes use, and
// the reference every other store must match (test/contract.ts).

interface OutboxRow {
  message: string;
  conversation: string;
  at: string;
  attempts: number;
  nextTry: string;
  lockedUntil: string | null;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Insertion order, for rows that share a time, as Postgres's `seq` keeps it. */
const seqOf = (id: string) => Number(id.slice(id.indexOf("-") + 1));
const byTime = (a: { at: string; id: string }, b: { at: string; id: string }) =>
  a.at.localeCompare(b.at) || seqOf(a.id) - seqOf(b.id);

class MemoryStore implements Store {
  private readonly conversations = new Map<string, Conversation>();
  private readonly rows = new Map<string, Row>();
  private readonly outbox = new Map<string, OutboxRow>();
  private readonly updates = new Set<string>();
  private next = 0;

  private id(prefix: string): string {
    return `${prefix}-${String(++this.next)}`;
  }

  find(channel: string, chat: string): Promise<Conversation | null> {
    const found = [...this.conversations.values()].find(
      (c) => c.channel === channel && c.chat === chat,
    );
    return Promise.resolve(found ?? null);
  }

  get(id: string): Promise<Conversation | null> {
    return Promise.resolve(this.conversations.get(id) ?? null);
  }

  open(
    channel: string,
    chat: string,
    owner: Owner,
    now: string,
  ): Promise<Conversation> {
    const c: Conversation = {
      id: this.id("c"),
      channel,
      chat,
      owner,
      startedAt: now,
      lastMessageAt: null,
    };
    this.conversations.set(c.id, c);
    return Promise.resolve(c);
  }

  remove(id: string): Promise<void> {
    this.conversations.delete(id);
    for (const r of this.rows.values())
      if (r.conversation === id) {
        this.rows.delete(r.id);
        this.outbox.delete(r.id);
      }
    return Promise.resolve();
  }

  seen(channel: string, updateId: string): Promise<boolean> {
    const key = `${channel}:${updateId}`;
    const before = this.updates.has(key);
    this.updates.add(key);
    return Promise.resolve(before);
  }

  add(row: Omit<Row, "id">): Promise<Row> {
    const r: Row = { ...row, id: this.id("m") };
    this.rows.set(r.id, r);
    const c = this.conversations.get(r.conversation);
    if (c) this.conversations.set(c.id, { ...c, lastMessageAt: r.at });
    return Promise.resolve(r);
  }

  message(id: string): Promise<Row | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  messages(conversation: string): Promise<Row[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((r) => r.conversation === conversation)
        .sort(byTime),
    );
  }

  byChannelId(conversation: string, channelId: string): Promise<Row | null> {
    const found = [...this.rows.values()].find(
      (r) => r.conversation === conversation && r.channelId === channelId,
    );
    return Promise.resolve(found ?? null);
  }

  advance(
    id: string,
    status: Status,
    extra: { channelId?: string; error?: string } = {},
  ): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || !mayAdvance(r.status, status)) return Promise.resolve(false);
    this.rows.set(id, {
      ...r,
      status,
      channelId: extra.channelId ?? r.channelId,
      error: extra.error ?? r.error,
    });
    return Promise.resolve(true);
  }

  waiting(conversation: string, context: unknown): Promise<Row[]> {
    return Promise.resolve(
      [...this.rows.values()].filter(
        (r) =>
          r.conversation === conversation &&
          r.status === "queued" &&
          same(r.context, context),
      ),
    );
  }

  purge(before: string): Promise<number> {
    let n = 0;
    for (const r of this.rows.values())
      if (r.at < before) {
        this.rows.delete(r.id);
        this.outbox.delete(r.id);
        n++;
      }
    return Promise.resolve(n);
  }

  enqueue(message: string, at: string): Promise<void> {
    const r = this.rows.get(message);
    if (r)
      this.outbox.set(message, {
        message,
        conversation: r.conversation,
        at,
        attempts: 0,
        nextTry: at,
        lockedUntil: null,
      });
    return Promise.resolve();
  }

  claim(now: string, until: string): Promise<Due[]> {
    // A conversation with a row someone holds yields nothing more: one
    // message at a time per chat, in order.
    const rows = [...this.outbox.values()];
    const taken = new Set(
      rows
        .filter((o) => o.lockedUntil !== null && o.lockedUntil > now)
        .map((o) => o.conversation),
    );
    const due: Due[] = [];
    rows.sort((a, b) =>
      byTime({ at: a.at, id: a.message }, { at: b.at, id: b.message }),
    );
    for (const o of rows) {
      if (o.nextTry > now || taken.has(o.conversation)) continue;
      taken.add(o.conversation);
      o.lockedUntil = until;
      due.push({
        message: o.message,
        conversation: o.conversation,
        attempts: o.attempts,
      });
    }
    return Promise.resolve(due);
  }

  retry(message: string, nextTry: string, attempts: number): Promise<void> {
    const o = this.outbox.get(message);
    if (o) Object.assign(o, { nextTry, attempts, lockedUntil: null });
    return Promise.resolve();
  }

  dequeue(message: string): Promise<void> {
    this.outbox.delete(message);
    return Promise.resolve();
  }
}

export function memoryStore(): Store {
  return new MemoryStore();
}
