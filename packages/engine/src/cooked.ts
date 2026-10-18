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

/**
 * Dishes planned for the last `days` days before `today` (specs/195): a meal
 * planned for a day that has passed counts as made, so the next days stay
 * different, unless it wasn't made, or moved on for its prep.
 */
export function plannedLately(
  plans: readonly {
    on: string;
    dish: string;
    made?: "no";
    prep?: "done" | "skipped" | null;
  }[],
  today: string,
  days: number,
): Set<string> {
  const since = addDays(today, -days);
  return new Set(
    plans
      .filter(
        (p) =>
          p.on >= since &&
          p.on < today &&
          p.made !== "no" &&
          p.prep !== "skipped",
      )
      .map((p) => p.dish),
  );
}
