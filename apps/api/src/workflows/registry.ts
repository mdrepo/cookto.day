import {
  CHANGE_CLOSE,
  CHANGE_SENT,
  CHANGE_WAIT,
  CHECK_ADDED,
  NOT_SEEN_CHANGE,
  PLAN_CHANGE,
  PLAN_KEPT,
  SEEN_CHANGE,
  DAY_END,
  MEAL_AGAIN,
  MEAL_CHECK,
  NOT_MADE,
  NOT_SEEN_PLAN,
  SEEN_PLAN,
  SENT_AS_PLANNED,
  SET_UP,
  TO_COOK,
  TO_COOK_OFF,
  TOMORROW,
  TOMORROW_OFF,
  TOMORROW_SELF,
  type Workflow,
} from "@cookto/workflows";
import { startChecks } from "./checks.js";
import type { Starter } from "./deps.js";
import { startTomorrow } from "./tomorrow.js";

// The workflows the bot runs (ADR 0034), by name, and the starters the cron
// runs each minute: tomorrow's plan (specs/241) and the cook's meal checks
// (specs/242), and the planners' "set up" (specs/260). Receipts come with
// their own spec.

export const WORKFLOWS: Record<string, Workflow> = Object.fromEntries(
  [
    TOMORROW,
    TOMORROW_OFF,
    TOMORROW_SELF,
    TO_COOK,
    TO_COOK_OFF,
    SENT_AS_PLANNED,
    SEEN_PLAN,
    NOT_SEEN_PLAN,
    MEAL_CHECK,
    MEAL_AGAIN,
    DAY_END,
    NOT_MADE,
    CHECK_ADDED,
    SET_UP,
    CHANGE_WAIT,
    PLAN_CHANGE,
    CHANGE_CLOSE,
    PLAN_KEPT,
    CHANGE_SENT,
    SEEN_CHANGE,
    NOT_SEEN_CHANGE,
  ].map((w) => [w.name, w]),
);

export const STARTERS: Starter[] = [startTomorrow, startChecks];
