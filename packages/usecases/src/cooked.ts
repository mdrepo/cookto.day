import type { CookedReader } from "@cookto/data/read";
import type { CookedWriter } from "@cookto/data/write";

// What the household cooked (specs/104): one tap, and Today keeps the next
// days different.

interface Cooked {
  cooked: { reader: CookedReader; writer: CookedWriter };
}

/** How many days after cooking a dish isn't anyone's pick. */
export const KEEP_DIFFERENT_DAYS = 2;

/** "We cooked this": the dish, today. */
export async function cookedIt(
  k: Cooked,
  dish: string,
  today: string,
): Promise<void> {
  await k.cooked.writer.add(dish, today);
}

/** Not cooked today after all: "Undo" (#116). */
export async function notCooked(
  k: Cooked,
  dish: string,
  today: string,
): Promise<void> {
  await k.cooked.writer.remove(dish, today);
}
