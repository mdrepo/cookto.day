import type { RunRow, Runs } from "@cookto/db";
import type { Catalogues } from "@cookto/templates";
import type { Event, Workflow } from "@cookto/workflows";

// What the workflows engine needs (ADR 0034): the runs, the workflows by
// name, the actions they name, every language's templates, and the switch
// for everyone. Production has no workflows yet (specs/234); the tests give
// it one.

/**
 * An action a step names. It changes the household; `key` is the run and
 * the step it ran at, so running it again with the same key changes nothing.
 */
export type Action = (a: {
  run: RunRow;
  key: string;
  input: Event;
}) => Promise<void>;

export interface WorkflowDeps {
  runs: Runs;
  workflows: Record<string, Workflow>;
  actions: Record<string, Action>;
  templates: Catalogues;
  /** BOT_OFF: no run starts, and no run's message is queued. */
  off: boolean;
  /** How long a claim holds, in milliseconds. */
  leaseMs: number;
}
