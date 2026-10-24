import { MEAL_SLOTS, type MealSlot } from "./household.js";

// The household's schedule (specs/240): the cook's days off, and meals in
// the day's order. Its own entry, "@cookto/engine/schedule", so only
// Settings and the server load it.

/** The cook's days off: weekdays (0 is Sunday) and single dates. */
export interface DaysOff {
  weekdays: number[];
  /** "YYYY-MM-DD", in the household's calendar. */
  dates: string[];
}

/** The weekday of a "YYYY-MM-DD", 0 for Sunday, whatever the clock's zone. */
const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** Whether the cook is cooking that day: not one of her days off. */
export function cooksOn(day: string, { daysOff }: { daysOff: DaysOff }) {
  return (
    !daysOff.dates.includes(day) && !daysOff.weekdays.includes(weekdayOf(day))
  );
}

/** Days off without the dates already past: they drop off by themselves. */
export function upcomingDaysOff(daysOff: DaysOff, today: string): DaysOff {
  return { ...daysOff, dates: daysOff.dates.filter((d) => d >= today) };
}

/**
 * The first meal eaten no later than the one before it, and that one; null
 * when each is later than the last. Only the meals in `eaten` count.
 */
export function mealTimeProblem(
  times: Readonly<Record<MealSlot, string>>,
  eaten: readonly MealSlot[],
): { meal: MealSlot; before: MealSlot } | null {
  const slots = MEAL_SLOTS.filter((s) => eaten.includes(s));
  for (let i = 1; i < slots.length; i++) {
    const meal = slots[i];
    const before = slots[i - 1];
    if (meal && before && times[meal] <= times[before]) return { meal, before };
  }
  return null;
}
