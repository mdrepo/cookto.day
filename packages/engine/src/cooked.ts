// What the household cooked, and when (specs/104): dishes cooked in the last
// few days, before today, aren't any meal's pick.
import { addDays } from "./expiry.js";

export interface Cooked {
  dish: string;
  /** "YYYY-MM-DD". */
  on: string;
}

/** Dishes cooked in the `days` days before `today`, not today itself. */
export function cookedLately(
  history: readonly Cooked[],
  today: string,
  days: number,
): Set<string> {
  const since = addDays(today, -days);
  return new Set(
    history.filter((c) => c.on >= since && c.on < today).map((c) => c.dish),
  );
}

/** Dishes cooked on `day`. */
export function cookedOn(history: readonly Cooked[], day: string): Set<string> {
  return new Set(history.filter((c) => c.on === day).map((c) => c.dish));
}
