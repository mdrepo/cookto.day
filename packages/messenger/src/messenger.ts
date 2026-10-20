import type { Channel, Sender } from "./channel.js";
import { drain, type Drained } from "./drain.js";
import type { Event, Message } from "./message.js";
import type { Conversation, Row, Store } from "./store.js";

// The messenger (ADR 0031): send records a message and queues it; receive
// verifies a webhook, drops a repeat, records what came in, and hands back
// one event for the API to decide on. It knows nothing of plans or cooks.

export interface SendOptions {
  /** The caller's; stored and returned, never read here. */
  context?: unknown;
  /** When to send it, ISO; now when left out. */
  at?: string;
  /** Cancels any message still waiting with the same context first. */
  replaces?: boolean;
}

/** What a webhook brought, for the handler. */
export interface Received {
  chat: string;
  event: Event;
  /** The conversation this chat has, if any. */
  conversation: Conversation | null;
  /** The incoming message as recorded, when there was a conversation. */
  message: Row | null;
  /** Seen before: nothing was recorded, nothing should be done. */
  duplicate: boolean;
  /** Who sent it, when the channel says (spec #216); never recorded. */
  from?: Sender;
}

export interface Messenger {
  readonly channel: Channel;
  readonly store: Store;
  send(
    conversation: string,
    message: Message,
    options?: SendOptions,
  ): Promise<string>;
  /** null: refused, answer 401. */
  receive(body: string, headers: Headers): Promise<Received | null>;
  drain(): Promise<Drained[]>;
}

export interface MessengerOptions {
  channel: Channel;
  store: Store;
  now: () => string;
}

export function createMessenger(o: MessengerOptions): Messenger {
  const { channel, store } = o;

  async function send(
    conversation: string,
    message: Message,
    options: SendOptions = {},
  ): Promise<string> {
    const c = await store.get(conversation);
    if (!c) throw new Error("no-conversation");
    if (!channel.supports(message.kind)) throw new Error("unsupported-kind");
    if (options.replaces && options.context !== undefined)
      for (const old of await store.waiting(conversation, options.context)) {
        await store.advance(old.id, "cancelled");
        await store.dequeue(old.id);
      }
    const now = o.now();
    const row = await store.add({
      conversation,
      direction: "out",
      kind: message.kind,
      content: message,
      answers: null,
      channelId: null,
      at: now,
      status: "queued",
      error: null,
      context: options.context ?? null,
    });
    await store.enqueue(row.id, options.at ?? now);
    return row.id;
  }

  async function receive(
    body: string,
    headers: Headers,
  ): Promise<Received | null> {
    const parsed = channel.parse(body, headers);
    if (!parsed) return null;
    const { chat, event } = parsed;
    const now = o.now();
    const conversation = await store.find(channel.name, chat);
    const base = {
      chat,
      event,
      conversation,
      ...(parsed.from && { from: parsed.from }),
    };
    if (await store.seen(channel.name, parsed.updateId, now))
      return { ...base, message: null, duplicate: true };
    let message: Row | null = null;
    if (conversation) {
      const answered =
        event.kind === "button" && event.answers !== null
          ? await store.byChannelId(conversation.id, event.answers)
          : null;
      message = await store.add({
        conversation: conversation.id,
        direction: "in",
        kind: event.kind,
        content: event,
        answers: answered?.id ?? null,
        channelId: null,
        at: now,
        status: null,
        error: null,
        context: null,
      });
      if (answered) await store.advance(answered.id, "replied");
    }
    if (parsed.ack !== undefined && channel.acknowledge)
      await channel.acknowledge(parsed.ack);
    return { ...base, message, duplicate: false };
  }

  return {
    channel,
    store,
    send,
    receive,
    drain: () => drain({ store, channel, now: o.now }),
  };
}
