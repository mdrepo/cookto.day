import type { Action } from "./deps.js";

// The actions workflows run (ADR 0034), one registry: the tools an AI
// router may call later. passOn keeps what she said for the planner; the
// messenger has already recorded it in her conversation, so it changes
// nothing more until the app shows it (a workflow's spec).

export const ACTIONS: Record<string, Action> = {
  passOn: () => Promise.resolve(),
};
