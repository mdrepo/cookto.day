import {
  CHECK_ADDED,
  DAY_END,
  MEAL_AGAIN,
  MEAL_CHECK,
  NOT_MADE,
  SENT_AS_PLANNED,
  TO_COOK,
  TO_COOK_OFF,
  TOMORROW,
  TOMORROW_OFF,
  type Workflow,
} from "@cookto/workflows";
import { startChecks } from "./checks.js";
import type { Starter } from "./deps.js";
import { startTomorrow } from "./tomorrow.js";

// The workflows the bot runs (ADR 0034), by name, and the starters the cron
// runs each minute: tomorrow's plan (specs/241) and the cook's meal checks
// (specs/242). Receipts come with their own spec.

export const WORKFLOWS: Record<string, Workflow> = Object.fromEntries(
  [
    TOMORROW,
    TOMORROW_OFF,
    TO_COOK,
    TO_COOK_OFF,
    SENT_AS_PLANNED,
    MEAL_CHECK,
    MEAL_AGAIN,
    DAY_END,
    NOT_MADE,
    CHECK_ADDED,
  ].map((w) => [w.name, w]),
);

export const STARTERS: Starter[] = [startTomorrow, startChecks];
