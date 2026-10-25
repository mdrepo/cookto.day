import type { Call } from "./functions.js";
import type { Made } from "./links.js";

// Sign-in (spec #216, db/migrations/0004): a sign-in link, the identity
// Start makes or finds, and sessions by hash. The session's token, like a
// link's, is seen once: when the phone claims it.

/** Who pressed Start: the channel's own id for the person, and a name. */
export interface Sender {
  id: string;
  name: string;
}

export type Started =
  { ok: true; name: string } | { ok: false; reason: "not-sign-in" | "bad" };

export type Claimed =
  | { state: "waiting" | "expired" | "gone" }
  | { state: "used"; name: string; session: string };

export interface Session {
  account: string;
  name: string;
}

export interface AuthStore {
  /** A sign-in link: a code for Start and a token for the phone's poll. */
  makeLink(addressHash: string, now: string): Promise<Made>;
  /** Start with a sign-in code: the account is made or found. */
  start(
    code: string,
    channel: string,
    from: Sender,
    now: string,
  ): Promise<Started>;
  /** The phone's poll: once Start has happened, the session's token, once. */
  claim(tokenHash: string, now: string): Promise<Claimed>;
  /** The session, with its last use moved; null when gone or 30 days old. */
  session(hash: string, now: string): Promise<Session | null>;
  end(hash: string): Promise<boolean>;
  /**
   * A session for the account behind a channel's user id, as a web app the
   * bot opened proves it (specs/241); the account is made, as Start makes
   * it, for someone who has none (specs/260).
   */
  sessionFor(
    channel: string,
    from: Sender,
    now: string,
  ): Promise<{ name: string; session: string }>;
  /** The account behind a channel's user id, or null (specs/260). */
  accountOf(channel: string, userId: string): Promise<string | null>;
  housekeeping(now: string): Promise<{ sessions: number }>;
}

export function functionAuth(call: Call, secret: string): AuthStore {
  const c = (fn: Parameters<Call>[0], args: Record<string, unknown>) =>
    call(fn, { p_secret: secret, ...args });
  return {
    makeLink: (addressHash, now) =>
      c("auth_link_make", {
        p_address_hash: addressHash,
        p_now: now,
      }) as Promise<Made>,
    start: (code, channel, from, now) =>
      c("auth_start", {
        p_code: code,
        p_channel: channel,
        p_user_id: from.id,
        p_name: from.name,
        p_now: now,
      }) as Promise<Started>,
    claim: (tokenHash, now) =>
      c("auth_claim", {
        p_token_hash: tokenHash,
        p_now: now,
      }) as Promise<Claimed>,
    session: (hash, now) =>
      c("auth_session", {
        p_hash: hash,
        p_now: now,
      }) as Promise<Session | null>,
    end: (hash) => c("auth_session_end", { p_hash: hash }) as Promise<boolean>,
    sessionFor: (channel, from, now) =>
      c("auth_telegram_session", {
        p_channel: channel,
        p_user_id: from.id,
        p_name: from.name,
        p_now: now,
      }) as Promise<{ name: string; session: string }>,
    accountOf: (channel, userId) =>
      c("auth_account_of", {
        p_channel: channel,
        p_user_id: userId,
      }) as Promise<string | null>,
    housekeeping: (now) =>
      c("auth_housekeeping", { p_now: now }) as Promise<{ sessions: number }>,
  };
}
