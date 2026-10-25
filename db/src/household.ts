import type { Conversation } from "@cookto/messenger";
import type { Sender } from "./auth.js";
import type { Call } from "./functions.js";
import type { Made } from "./links.js";

// Households (spec #217, db/migrations/0005): members by account or by
// chat, records whole at their version, a changes log with one sequence,
// invites by role. One household per account, so every call names only the
// account asking; the function finds the household and checks membership.

export type Role = "plan" | "cook";

export interface MemberRow {
  id: string;
  role: Role;
  /** A planner with an account, or the cook by her Telegram chat. */
  kind: "account" | "telegram";
  /** The first name sign-in kept; null for the cook. */
  name: string | null;
  /** The cook sent /stop: her conversation is gone, she's still listed. */
  stopped: boolean;
}

export interface HouseholdView {
  id: string;
  members: MemberRow[];
}

/** A record as a phone pushes it: whole, with its version inside. */
export interface PushedRecord {
  collection: string;
  record: { id: string; version: number; [field: string]: unknown };
}

export interface Change {
  seq: number;
  collection: string;
  record: PushedRecord["record"];
  at: string;
}

export type Created =
  { ok: true; household: string } | { ok: false; reason: "exists" };

export type Invited = Made | { ok: false; reason: "no-household" };

export type InviteStarted =
  | { ok: true; role: "cook"; conversation: Conversation }
  | { ok: true; role: "plan"; conversation?: undefined }
  | { ok: false; reason: "not-invite" | "bad" };

export type Removed = { ok: true; chat: string | null } | { ok: false };

export type Cooks =
  | { ok: true; conversations: string[] }
  | { ok: false; reason: "no-household" | "no-cook" | "limit" };

export type Pushed =
  { ok: true; refused: PushedRecord[] } | { ok: false; reason: "forbidden" };

export interface Pulled {
  changes: Change[];
  cursor: number;
  more: boolean;
  /** The cursor was older than what's kept: these are every record. */
  reset: boolean;
}

export interface Households {
  /** A household from a phone's records; the account its first planner. */
  create(
    account: string,
    records: PushedRecord[],
    now: string,
  ): Promise<Created>;
  /** The cook's link this phone held becomes a member of the household. */
  claimCook(
    account: string,
    tokenHash: string,
    now: string,
  ): Promise<{ ok: boolean }>;
  get(account: string): Promise<HouseholdView | null>;
  invite(
    account: string,
    role: Role,
    addressHash: string,
    now: string,
  ): Promise<Invited>;
  /** Start with an invite's code, from a chat and, when known, a person. */
  startInvite(
    code: string,
    channel: string,
    chat: string,
    from: Sender | null,
    now: string,
  ): Promise<InviteStarted>;
  removeMember(account: string, member: string): Promise<Removed>;
  /** The cooks' conversations, if one more send is allowed today. */
  cooks(account: string, now: string): Promise<Cooks>;
  deleteAccount(account: string): Promise<{ household: boolean }>;
  push(account: string, records: PushedRecord[], now: string): Promise<Pushed>;
  /** Null when the account has no household. */
  changes(
    account: string,
    after: number,
    limit: number,
  ): Promise<Pulled | null>;
  housekeeping(now: string): Promise<{ changes: number }>;
  /** One collection of a household's records, whole, in id order (specs/240). */
  records(
    household: string,
    collection: string,
  ): Promise<PushedRecord["record"][]>;
  /** Every household, with its switch: the cron's list (specs/241). */
  list(): Promise<{ id: string; botOff: boolean }[]>;
  /** The server's own writes, by the phones' rules: what was refused. */
  put(
    household: string,
    records: PushedRecord[],
    now: string,
  ): Promise<PushedRecord[]>;
  /** Each planner reached in the chat they signed in from (specs/241). */
  reachPlanners(household: string, channel: string, now: string): Promise<void>;
}

export function functionHouseholds(call: Call, secret: string): Households {
  const c = (fn: Parameters<Call>[0], args: Record<string, unknown>) =>
    call(fn, { p_secret: secret, ...args });
  return {
    create: (account, records, now) =>
      c("hh_create", {
        p_account: account,
        p_records: records,
        p_now: now,
      }) as Promise<Created>,
    claimCook: (account, tokenHash, now) =>
      c("hh_claim_cook", {
        p_account: account,
        p_token_hash: tokenHash,
        p_now: now,
      }) as Promise<{ ok: boolean }>,
    get: (account) =>
      c("hh_get", { p_account: account }) as Promise<HouseholdView | null>,
    invite: (account, role, addressHash, now) =>
      c("hh_invite", {
        p_account: account,
        p_role: role,
        p_address_hash: addressHash,
        p_now: now,
      }) as Promise<Invited>,
    startInvite: (code, channel, chat, from, now) =>
      c("hh_invite_start", {
        p_code: code,
        p_channel: channel,
        p_chat: chat,
        p_user_id: from?.id ?? null,
        p_name: from?.name ?? null,
        p_now: now,
      }) as Promise<InviteStarted>,
    removeMember: (account, member) =>
      c("hh_member_remove", {
        p_account: account,
        p_member: member,
      }) as Promise<Removed>,
    cooks: (account, now) =>
      c("hh_cooks", { p_account: account, p_now: now }) as Promise<Cooks>,
    deleteAccount: (account) =>
      c("hh_account_delete", { p_account: account }) as Promise<{
        household: boolean;
      }>,
    push: (account, records, now) =>
      c("sync_push", {
        p_account: account,
        p_records: records,
        p_now: now,
      }) as Promise<Pushed>,
    changes: (account, after, limit) =>
      c("sync_changes", {
        p_account: account,
        p_after: after,
        p_limit: limit,
      }) as Promise<Pulled | null>,
    housekeeping: (now) =>
      c("hh_housekeeping", { p_now: now }) as Promise<{ changes: number }>,
    records: (household, collection) =>
      c("hh_records", {
        p_household: household,
        p_collection: collection,
      }) as Promise<PushedRecord["record"][]>,
    list: () => c("hh_list", {}) as Promise<{ id: string; botOff: boolean }[]>,
    put: (household, records, now) =>
      c("hh_put", {
        p_household: household,
        p_records: records,
        p_now: now,
      }) as Promise<PushedRecord[]>,
    reachPlanners: async (household, channel, now) => {
      await c("hh_reach_planners", {
        p_household: household,
        p_channel: channel,
        p_now: now,
      });
    },
  };
}
