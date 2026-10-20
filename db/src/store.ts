import type {
  Conversation,
  Due,
  Owner,
  Row,
  Status,
  Store,
} from "@cookto/messenger";
import type { Call } from "./functions.js";

// The messenger's Store on Postgres (ADR 0031, 0032): each method is one
// function call (db/migrations/0002). The rows come back already in the
// package's shape, so nothing is mapped here.

export function functionStore(call: Call, secret: string): Store {
  const c = (fn: Parameters<Call>[0], args: Record<string, unknown>) =>
    call(fn, { p_secret: secret, ...args });
  return {
    find: (channel, chat) =>
      c("msg_conversation_find", {
        p_channel: channel,
        p_chat: chat,
      }) as Promise<Conversation | null>,
    get: (id) =>
      c("msg_conversation_get", { p_id: id }) as Promise<Conversation | null>,
    open: (channel, chat, owner: Owner, now) =>
      c("msg_conversation_open", {
        p_channel: channel,
        p_chat: chat,
        p_owner_kind: owner.kind,
        p_owner_id: owner.id,
        p_now: now,
      }) as Promise<Conversation>,
    remove: async (id) => {
      await c("msg_conversation_remove", { p_id: id });
    },
    seen: (channel, updateId, now) =>
      c("msg_update_seen", {
        p_channel: channel,
        p_update_id: updateId,
        p_now: now,
      }) as Promise<boolean>,
    add: (row) => c("msg_message_add", { p_row: row }) as Promise<Row>,
    message: (id) => c("msg_message_get", { p_id: id }) as Promise<Row | null>,
    messages: (conversation) =>
      c("msg_messages", { p_conversation: conversation }) as Promise<Row[]>,
    byChannelId: (conversation, channelId) =>
      c("msg_message_by_channel_id", {
        p_conversation: conversation,
        p_channel_id: channelId,
      }) as Promise<Row | null>,
    advance: (id, status: Status, extra = {}) =>
      c("msg_message_advance", {
        p_id: id,
        p_status: status,
        p_channel_id: extra.channelId ?? null,
        p_error: extra.error ?? null,
      }) as Promise<boolean>,
    waiting: (conversation, context) =>
      c("msg_messages_waiting", {
        p_conversation: conversation,
        p_context: context,
      }) as Promise<Row[]>,
    purge: (before) =>
      c("msg_messages_purge", { p_before: before }) as Promise<number>,
    enqueue: async (message, at) => {
      await c("msg_outbox_enqueue", { p_message: message, p_at: at });
    },
    claim: (now, until) =>
      c("msg_outbox_claim", { p_now: now, p_until: until }) as Promise<Due[]>,
    retry: async (message, nextTry, attempts) => {
      await c("msg_outbox_retry", {
        p_message: message,
        p_next_try: nextTry,
        p_attempts: attempts,
      });
    },
    dequeue: async (message) => {
      await c("msg_outbox_dequeue", { p_message: message });
    },
  };
}
