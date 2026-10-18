import type { Role } from "@cookto/data";
import type { PlansReader } from "@cookto/data/read";
import type { PlansWriter, WhoCooksWriter } from "@cookto/data/write";
import type { MealSlot } from "@cookto/engine";

// Who cooks (specs/195): this phone is the planner's or the cook's; the
// planner approves tomorrow, swaps a pick, or says a meal wasn't made.

interface Plans {
  plans: { reader: PlansReader; writer: PlansWriter };
}

/** "I plan the meals", or "I cook the meals": per phone. */
export function chooseRole(
  { settings }: { settings: WhoCooksWriter },
  role: Role,
): void {
  settings.setRole(role);
}

/** "Looks good": tomorrow's plan is sorted. */
export function sortTomorrow(
  { settings }: { settings: WhoCooksWriter },
  tomorrow: string,
): void {
  settings.setSorted(tomorrow);
}

/** Another idea for one of tomorrow's meals. */
export async function swapTomorrow(
  k: Plans,
  tomorrow: string,
  slot: MealSlot,
  dish: string,
): Promise<void> {
  await k.plans.writer.swap(tomorrow, slot, dish);
}

/** "Didn't make it": a planned meal of the last days, not made after all. */
export async function didntMake(
  k: Plans,
  on: string,
  slot: MealSlot,
): Promise<void> {
  await k.plans.writer.notMade(on, slot);
}
