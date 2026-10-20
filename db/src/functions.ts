// The functions the Worker calls (db/migrations/0002 to 0004), with each
// argument's SQL type. The API calls them over HTTPS; the tests call them
// through a Postgres client, which needs the types to cast its arguments.

export type SqlType = "text" | "uuid" | "timestamptz" | "jsonb" | "int";

const SECRET = { p_secret: "text" } as const;

export const FUNCTIONS = {
  msg_conversation_find: { ...SECRET, p_channel: "text", p_chat: "text" },
  msg_conversation_get: { ...SECRET, p_id: "uuid" },
  msg_conversation_open: {
    ...SECRET,
    p_channel: "text",
    p_chat: "text",
    p_owner_kind: "text",
    p_owner_id: "text",
    p_now: "timestamptz",
  },
  msg_conversation_remove: { ...SECRET, p_id: "uuid" },
  msg_update_seen: {
    ...SECRET,
    p_channel: "text",
    p_update_id: "text",
    p_now: "timestamptz",
  },
  msg_message_add: { ...SECRET, p_row: "jsonb" },
  msg_message_get: { ...SECRET, p_id: "uuid" },
  msg_messages: { ...SECRET, p_conversation: "uuid" },
  msg_message_by_channel_id: {
    ...SECRET,
    p_conversation: "uuid",
    p_channel_id: "text",
  },
  msg_message_advance: {
    ...SECRET,
    p_id: "uuid",
    p_status: "text",
    p_channel_id: "text",
    p_error: "text",
  },
  msg_messages_waiting: {
    ...SECRET,
    p_conversation: "uuid",
    p_context: "jsonb",
  },
  msg_messages_purge: { ...SECRET, p_before: "timestamptz" },
  msg_outbox_enqueue: { ...SECRET, p_message: "uuid", p_at: "timestamptz" },
  msg_outbox_claim: { ...SECRET, p_now: "timestamptz", p_until: "timestamptz" },
  msg_outbox_retry: {
    ...SECRET,
    p_message: "uuid",
    p_next_try: "timestamptz",
    p_attempts: "int",
  },
  msg_outbox_dequeue: { ...SECRET, p_message: "uuid" },
  msg_link_make: { ...SECRET, p_address_hash: "text", p_now: "timestamptz" },
  msg_link_connect: {
    ...SECRET,
    p_code: "text",
    p_channel: "text",
    p_chat: "text",
    p_now: "timestamptz",
  },
  msg_link_status: { ...SECRET, p_token_hash: "text", p_now: "timestamptz" },
  msg_link_remove: { ...SECRET, p_token_hash: "text" },
  msg_link_send_allowed: {
    ...SECRET,
    p_token_hash: "text",
    p_now: "timestamptz",
  },
  msg_housekeeping: { ...SECRET, p_now: "timestamptz" },
  auth_link_make: { ...SECRET, p_address_hash: "text", p_now: "timestamptz" },
  auth_start: {
    ...SECRET,
    p_code: "text",
    p_channel: "text",
    p_user_id: "text",
    p_name: "text",
    p_now: "timestamptz",
  },
  auth_claim: { ...SECRET, p_token_hash: "text", p_now: "timestamptz" },
  auth_session: { ...SECRET, p_hash: "text", p_now: "timestamptz" },
  auth_session_end: { ...SECRET, p_hash: "text" },
  auth_housekeeping: { ...SECRET, p_now: "timestamptz" },
} as const satisfies Record<string, Record<string, SqlType>>;

export type FunctionName = keyof typeof FUNCTIONS;

/** Calls one function with named arguments and returns what it returned. */
export type Call = (
  fn: FunctionName,
  args: Record<string, unknown>,
) => Promise<unknown>;
