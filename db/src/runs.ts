import type { Message } from "@cookto/messenger";
import type { Call } from "./functions.js";

// Runs (ADR 0034, db/migrations/0007): one workflow happening for one
// household, about one thing, for an audience, the planners or one member.
// A press claims a run only at its step and revision, while nobody's lease
// runs; the commit moves it and queues its messages together.

export type RunStatus = "due" | "waiting" | "done" | "expired" | "cancelled";

export interface NewRun {
  /** 8 characters: it travels in a button. */
  id: string;
  household: string;
  /** "planners", or a member's id. */
  audience: string;
  workflow: string;
  /** What it's about: { day, meal }, a receipt. */
  about: Record<string, unknown>;
  dueAt: string;
  expiresAt: string | null;
  now: string;
}

export interface RunRow {
  id: string;
  household: string;
  audience: string;
  workflow: string;
  /** null until it starts. */
  step: string | null;
  about: Record<string, unknown>;
  status: RunStatus;
  rev: number;
  lease: string | null;
  dueAt: string;
  expiresAt: string | null;
  /** Its step takes her text or photo: it holds her floor. */
  floor: boolean;
  /** Our ids of the messages it sent last. */
  messages: string[];
}

/** A message a run sends, to one of its conversations. */
export interface Outgoing {
  conversation: string;
  message: Message;
  context: unknown;
}

export interface NextStep {
  step: string;
  status: RunStatus;
  floor: boolean;
}

export interface Runs {
  create(run: NewRun): Promise<RunRow>;
  get(id: string): Promise<(RunRow & { botOff: boolean }) | null>;
  /** Waiting runs a member answers: their own, the planners' if one. */
  open(member: string): Promise<RunRow[]>;
  /** The conversations a run speaks to. */
  conversations(id: string): Promise<string[]>;
  /** The run, claimed until `until`; null when someone else has it. */
  claim(
    id: string,
    step: string | null,
    rev: number,
    now: string,
    until: string,
  ): Promise<RunRow | null>;
  /** The claimed run moved, its messages queued with it. */
  commit(
    id: string,
    rev: number,
    next: NextStep,
    outgoing: Outgoing[],
    now: string,
  ): Promise<{ ok: boolean; ids: string[] }>;
  /** Due runs to start: households on, nobody holding the floor. */
  due(now: string): Promise<RunRow[]>;
  expired(now: string): Promise<RunRow[]>;
  /** The household's switch, by one of its planners. */
  setBotOff(account: string, off: boolean): Promise<void>;
}

export function functionRuns(call: Call, secret: string): Runs {
  const c = (fn: Parameters<Call>[0], args: Record<string, unknown>) =>
    call(fn, { p_secret: secret, ...args });
  return {
    create: (run) => c("run_create", { p_row: run }) as Promise<RunRow>,
    get: (id) =>
      c("run_get", { p_id: id }) as Promise<
        (RunRow & { botOff: boolean }) | null
      >,
    open: (member) => c("runs_open", { p_member: member }) as Promise<RunRow[]>,
    conversations: (id) =>
      c("run_conversations", { p_id: id }) as Promise<string[]>,
    claim: (id, step, rev, now, until) =>
      c("run_claim", {
        p_id: id,
        p_step: step,
        p_rev: rev,
        p_now: now,
        p_until: until,
      }) as Promise<RunRow | null>,
    commit: (id, rev, next, outgoing, now) =>
      c("run_commit", {
        p_id: id,
        p_rev: rev,
        p_next: next,
        p_messages: outgoing,
        p_now: now,
      }) as Promise<{ ok: boolean; ids: string[] }>,
    due: (now) => c("runs_due", { p_now: now }) as Promise<RunRow[]>,
    expired: (now) => c("runs_expired", { p_now: now }) as Promise<RunRow[]>,
    setBotOff: async (account, off) => {
      await c("hh_bot_off", { p_account: account, p_off: off });
    },
  };
}
