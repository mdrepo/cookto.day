import type { Workflow } from "@cookto/workflows";

// The workflows the bot runs (ADR 0034), by name. None yet (specs/234): the
// planner's yes or no, the helper's plan, the meal checks and receipts each
// come with their own spec.

export const WORKFLOWS: Record<string, Workflow> = {};
