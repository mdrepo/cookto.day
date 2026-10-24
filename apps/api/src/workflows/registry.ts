import {
  SENT_AS_PLANNED,
  TO_COOK,
  TO_COOK_OFF,
  TOMORROW,
  TOMORROW_OFF,
  type Workflow,
} from "@cookto/workflows";
import type { Starter } from "./deps.js";
import { startTomorrow } from "./tomorrow.js";

// The workflows the bot runs (ADR 0034), by name, and the starters the cron
// runs each minute. Tomorrow's plan first (specs/241); the meal checks and
// receipts each come with their own spec.

export const WORKFLOWS: Record<string, Workflow> = Object.fromEntries(
  [TOMORROW, TOMORROW_OFF, TO_COOK, TO_COOK_OFF, SENT_AS_PLANNED].map((w) => [
    w.name,
    w,
  ]),
);

export const STARTERS: Starter[] = [startTomorrow];
