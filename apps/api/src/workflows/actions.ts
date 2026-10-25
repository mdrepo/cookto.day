import { CHANGE_MEAL_ACTIONS } from "./change-meal.js";
import { CHANGE_ACTIONS } from "./changes.js";
import { CHECK_ACTIONS } from "./checks.js";
import type { Action } from "./deps.js";
import { TOMORROW_ACTIONS } from "./tomorrow.js";

// The actions workflows run (ADR 0034), one registry: the tools an AI
// router may call later. passOn keeps what she said for the planner; the
// messenger has already recorded it in her conversation, so it changes
// nothing more until the app shows it (a workflow's spec). Tomorrow's plan
// (specs/241) sorts, sends to the cook and makes a day off; the meal checks
// (specs/242) cook, use up, list and tell the planner.

export const ACTIONS: Record<string, Action> = {
  passOn: () => Promise.resolve(),
  ...TOMORROW_ACTIONS,
  ...CHECK_ACTIONS,
  ...CHANGE_ACTIONS,
  ...CHANGE_MEAL_ACTIONS,
};
