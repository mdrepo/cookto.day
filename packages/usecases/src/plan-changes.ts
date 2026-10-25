import type { MealSlot } from "@cookto/engine";
import type { PlanMeal, Word } from "./plan-lines.js";

// What changed in a day's plan since it went to the cook (specs/270), in
// the bot's words, one line a meal: another dish, another count, a meal
// gone or back, the child's dish. The caller has the words, by template
// id, and says whether the day is today or tomorrow.

export interface PlanChange {
  slot: MealSlot;
  line: string;
}

const keyOf = (m: PlanMeal) => `${m.slot}:${m.child ? "child" : ""}`;

/** Each meal that changed, in the day's order. */
export function planChanges(
  before: readonly PlanMeal[],
  after: readonly PlanMeal[],
  word: Word,
  /** "tomorrow" or "today", in words. */
  when: string,
): PlanChange[] {
  const was = new Map(before.map((m) => [keyOf(m), m]));
  const now = new Map(after.map((m) => [keyOf(m), m]));
  const lines: PlanChange[] = [];
  for (const m of after) {
    const old = was.get(keyOf(m));
    if (!old) {
      lines.push({
        slot: m.slot,
        line: word("change_back", { Meal: m.label, dish: m.dish }),
      });
      continue;
    }
    if (old.id !== m.id)
      lines.push({
        slot: m.slot,
        line: m.child
          ? word("change_child", {
              child: m.label,
              dish: m.dish,
              was: old.dish,
            })
          : word("change_dish", { Meal: m.label, dish: m.dish, was: old.dish }),
      });
    if (!m.child && old.n !== m.n)
      lines.push({
        slot: m.slot,
        line: word("change_count", { Meal: m.label, n: m.n }),
      });
  }
  for (const m of before)
    if (!now.has(keyOf(m)) && !m.child)
      lines.push({
        slot: m.slot,
        line: word("change_gone", {
          meal: m.label.toLocaleLowerCase("en"),
          when,
        }),
      });
  return lines;
}

/** The same plan: nothing to tell the cook. */
export const samePlan = (a: readonly PlanMeal[], b: readonly PlanMeal[]) =>
  JSON.stringify(a.map(({ slot, child, id, n }) => [slot, child, id, n])) ===
  JSON.stringify(b.map(({ slot, child, id, n }) => [slot, child, id, n]));
