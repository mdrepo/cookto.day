import type { RunRow, Runs } from "@cookto/db";
import type { Catalogues } from "@cookto/templates";
import type { Event, Workflow } from "@cookto/workflows";
import type { MessengerDeps } from "../messenger/deps.js";

// What the workflows engine needs (ADR 0034): the runs, the workflows by
// name, the actions they name, the starters the cron runs, every
// language's templates, and the switch for everyone.

/**
 * An action a step names. It changes the household; `key` is the run and
 * the step it ran at, so running it again with the same key changes nothing.
 * An object it returns fills the step's messages, beside the run's own
 * words (specs/270: the meals to change, the ideas); `buttons` keeps only
 * those.
 */
export type Action = (a: {
  run: RunRow;
  key: string;
  input: Event;
  d: MessengerDeps;
}) => Promise<unknown>;

/** Makes the runs that are due now, each once: tomorrow's at 10 pm. */
export type Starter = (d: MessengerDeps) => Promise<void>;

export interface WorkflowDeps {
  runs: Runs;
  workflows: Record<string, Workflow>;
  actions: Record<string, Action>;
  starters?: Starter[];
  templates: Catalogues;
  /** BOT_OFF: no run starts, and no run's message is queued. */
  off: boolean;
  /** How long a claim holds, in milliseconds. */
  leaseMs: number;
}
