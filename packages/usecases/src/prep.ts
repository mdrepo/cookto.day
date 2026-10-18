import type { Beans } from "@cookto/data";
import type { PlansReader } from "@cookto/data/read";
import type { BeansWriter, PlansWriter } from "@cookto/data/write";
import { addDays, type MealSlot } from "@cookto/engine";

// Prep the day before (specs/144): tomorrow is planned tonight, its prep is
// marked done, or a "No" in the morning moves the dish to tomorrow.

interface Plans {
  plans: { reader: PlansReader; writer: PlansWriter };
}

/** From 4 pm: tomorrow's picks, kept so tomorrow morning shows the same. */
export async function keepTomorrow(
  k: Plans,
  tomorrow: string,
  picks: Partial<Record<MealSlot, string>>,
): Promise<void> {
  for (const [slot, dish] of Object.entries(picks) as [MealSlot, string][])
    await k.plans.writer.plan(tomorrow, slot, dish);
}

/** "Done": the prep for a planned meal started at `since`, "HH:MM". */
export async function prepDone(
  k: Plans,
  on: string,
  slot: MealSlot,
  since: string,
): Promise<void> {
  await k.plans.writer.prep(on, slot, "done", since);
}

/** "No", the morning after: today's plan ends; the dish is tomorrow's. */
export async function prepNotDone(
  k: Plans,
  today: string,
  slot: MealSlot,
): Promise<void> {
  const plan = (await k.plans.reader.all()).find(
    (p) => p.on === today && p.slot === slot,
  );
  if (!plan) return;
  await k.plans.writer.prep(today, slot, "skipped");
  await k.plans.writer.plan(addDays(today, 1), slot, plan.dish);
}

/** Dried or tinned beans (Settings). */
export function chooseBeans(
  { settings }: { settings: BeansWriter },
  beans: Beans,
): void {
  settings.setBeans(beans);
}
