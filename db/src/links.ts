import type { Conversation } from "@cookto/messenger";
import type { Call } from "./functions.js";

// Links (spec #207, db/migrations/0003): a phone's code and token, the
// conversation that opens when the cook sends the code, and the day's send
// limit. The token is only ever seen once, when the link is made.

export type Made =
  | { ok: true; code: string; token: string; expiresAt: string }
  | { ok: false; reason: "limit" };

export type Connected =
  { ok: true; conversation: Conversation } | { ok: false };

export type LinkState =
  | { state: "waiting" | "expired" | "gone" }
  | { state: "connected"; conversation: Conversation };

export type Allowed =
  { ok: true; conversation: string } | { ok: false; reason: "gone" | "limit" };

export interface Links {
  make(addressHash: string, now: string): Promise<Made>;
  connect(
    code: string,
    channel: string,
    chat: string,
    now: string,
  ): Promise<Connected>;
  status(tokenHash: string, now: string): Promise<LinkState>;
  remove(tokenHash: string): Promise<boolean>;
  sendAllowed(tokenHash: string, now: string): Promise<Allowed>;
  housekeeping(
    now: string,
  ): Promise<{ messages: number; updates: number; links: number }>;
}

export function functionLinks(call: Call, secret: string): Links {
  const c = (fn: Parameters<Call>[0], args: Record<string, unknown>) =>
    call(fn, { p_secret: secret, ...args });
  return {
    make: (addressHash, now) =>
      c("msg_link_make", {
        p_address_hash: addressHash,
        p_now: now,
      }) as Promise<Made>,
    connect: (code, channel, chat, now) =>
      c("msg_link_connect", {
        p_code: code,
        p_channel: channel,
        p_chat: chat,
        p_now: now,
      }) as Promise<Connected>,
    status: (tokenHash, now) =>
      c("msg_link_status", {
        p_token_hash: tokenHash,
        p_now: now,
      }) as Promise<LinkState>,
    remove: (tokenHash) =>
      c("msg_link_remove", { p_token_hash: tokenHash }) as Promise<boolean>,
    sendAllowed: (tokenHash, now) =>
      c("msg_link_send_allowed", {
        p_token_hash: tokenHash,
        p_now: now,
      }) as Promise<Allowed>,
    housekeeping: (now) =>
      c("msg_housekeeping", { p_now: now }) as Promise<{
        messages: number;
        updates: number;
        links: number;
      }>,
  };
}
