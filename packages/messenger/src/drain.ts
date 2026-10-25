import { type Channel, ChannelError } from "./channel.js";
import type { Message } from "./message.js";
import type { Store } from "./store.js";

// The outbox's worker (ADR 0031): sends what's due, one row at a time per
// conversation. A row is marked `sending` before the call. If the channel
// says no, it's queued again for later, three times, then failed. If we find
// a row still `sending` when we claim it, something died between the call
// and the write; the channel has no idempotency key, so it's `unknown`,
// never sent again.

/** Minutes to wait before each retry (spec #207). */
export const BACKOFF_MINUTES = [1, 5, 30] as const;
/** How long a claimed row is ours. */
export const LOCK_MS = 60_000;

const plus = (iso: string, ms: number) =>
  new Date(new Date(iso).getTime() + ms).toISOString();

export interface DrainOptions {
  store: Store;
  channel: Channel;
  now: () => string;
}

/** What happened to each row, for the log: kinds and ids, never content. */
export interface Drained {
  message: string;
  outcome: "sent" | "retry" | "failed" | "unknown";
}

/** Rounds a drain takes at most: a reply's messages, one per round. */
export const ROUNDS = 12;

/**
 * Sends what's due, round after round until nothing is, so a reply's
 * messages arrive together (specs/270), still one at a time per chat.
 */
export async function drain(o: DrainOptions): Promise<Drained[]> {
  const done: Drained[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const now = o.now();
    const due = await o.store.claim(now, plus(now, LOCK_MS));
    if (due.length === 0) break;
    for (const d of due) done.push(await one(o, d.message, d.attempts));
  }
  return done;
}

async function one(
  o: DrainOptions,
  id: string,
  attempts: number,
): Promise<Drained> {
  const row = await o.store.message(id);
  const conversation = row && (await o.store.get(row.conversation));
  if (!row || !conversation || row.status === "sending") {
    if (row) await o.store.advance(id, "unknown");
    await o.store.dequeue(id);
    return { message: id, outcome: "unknown" };
  }
  await o.store.advance(id, "sending");
  const message = row.content as Message;
  try {
    const edits =
      message.kind === "edit" ? await channelIdOf(o, message.of) : undefined;
    const { id: channelId } = await o.channel.deliver(
      conversation.chat,
      message,
      edits,
    );
    await o.store.advance(id, "sent", { channelId });
    await o.store.dequeue(id);
    return { message: id, outcome: "sent" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const retry = e instanceof ChannelError && e.retry;
    const wait = BACKOFF_MINUTES[attempts];
    if (retry && wait !== undefined) {
      await o.store.advance(id, "queued", { error });
      const after = e.after !== undefined ? e.after * 1000 : wait * 60_000;
      await o.store.retry(id, plus(o.now(), after), attempts + 1);
      return { message: id, outcome: "retry" };
    }
    await o.store.advance(id, "failed", { error });
    await o.store.dequeue(id);
    return { message: id, outcome: "failed" };
  }
}

async function channelIdOf(o: DrainOptions, id: string): Promise<string> {
  const target = await o.store.message(id);
  if (!target?.channelId) throw new ChannelError("edit-of-unsent", false);
  return target.channelId;
}
