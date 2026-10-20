// Where conversations live (ADR 0031): three tables the package owns,
// conversations, messages and the outbox, behind this interface. The API
// gives it Postgres; tests give it memory. Both pass test/contract.ts.

/** Whose conversation it is: a link today, a household later. */
export interface Owner {
  kind: string;
  id: string;
}

export interface Conversation {
  id: string;
  channel: string;
  chat: string;
  owner: Owner;
  startedAt: string;
  lastMessageAt: string | null;
}

/**
 * An outgoing message's state, forward only: a status never goes back,
 * except `sending` to `queued` when the channel said no and we'll try again.
 * `failed`, `unknown` and `cancelled` are final, and only reached from
 * before `sent`: once the channel has it, it can't fail or be cancelled.
 */
export type Status =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "replied"
  | "failed"
  | "unknown"
  | "cancelled";

const ORDER: readonly Status[] = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "replied",
];
const FINAL: readonly Status[] = ["failed", "unknown", "cancelled"];

/** Whether a message may go from one status to the next. */
export function mayAdvance(from: Status | null, to: Status): boolean {
  if (from === null) return false;
  if (FINAL.includes(from)) return false;
  if (to === "cancelled") return from === "queued";
  if (FINAL.includes(to)) return from === "queued" || from === "sending";
  if (from === "sending" && to === "queued") return true;
  return ORDER.indexOf(to) > ORDER.indexOf(from);
}

/** One message, in or out. */
export interface Row {
  id: string;
  conversation: string;
  direction: "in" | "out";
  kind: string;
  /** The message as sent, or the event as received. */
  content: unknown;
  /** Our id of the message this one answers, if any. */
  answers: string | null;
  /** The channel's id for it, once it has one. */
  channelId: string | null;
  at: string;
  /** Outgoing only. */
  status: Status | null;
  error: string | null;
  /** The caller's, stored and returned, never read by the package. */
  context: unknown;
}

/** An outbox row the drain has claimed. */
export interface Due {
  message: string;
  conversation: string;
  attempts: number;
}

export interface Store {
  find(channel: string, chat: string): Promise<Conversation | null>;
  get(id: string): Promise<Conversation | null>;
  open(
    channel: string,
    chat: string,
    owner: Owner,
    now: string,
  ): Promise<Conversation>;
  /** Deletes the conversation, its messages and its outbox rows. */
  remove(id: string): Promise<void>;
  /** Whether this update was handled before; records it if not. */
  seen(channel: string, updateId: string, now: string): Promise<boolean>;

  add(row: Omit<Row, "id">): Promise<Row>;
  message(id: string): Promise<Row | null>;
  /** The conversation's messages, oldest first. */
  messages(conversation: string): Promise<Row[]>;
  /** By the channel's id, within a conversation. */
  byChannelId(conversation: string, channelId: string): Promise<Row | null>;
  /** Moves a message on, by the rules of `mayAdvance`; says whether it did. */
  advance(
    id: string,
    status: Status,
    extra?: { channelId?: string; error?: string },
  ): Promise<boolean>;
  /** Outgoing messages still waiting to be sent, with this context. */
  waiting(conversation: string, context: unknown): Promise<Row[]>;
  /** Deletes messages older than this; how many went. */
  purge(before: string): Promise<number>;

  enqueue(message: string, at: string): Promise<void>;
  /**
   * The rows due by `now`, at most one per conversation and none for a
   * conversation whose row someone still holds, locked until `until`. Two
   * drains at once never get the same row, nor two rows of one chat.
   */
  claim(now: string, until: string): Promise<Due[]>;
  retry(message: string, nextTry: string, attempts: number): Promise<void>;
  dequeue(message: string): Promise<void>;
}
