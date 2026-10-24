import type { ScheduleWriter } from "@cookto/data/write";
import type { MealSlot } from "@cookto/engine";

// The household's schedule (specs/240): when it eats each meal, and the
// cook's days off. The bot asks by them; the server only reads them.

interface Deps {
  settings: ScheduleWriter;
}

/**
 * A meal's time, unless it isn't later than the meal before it: then the
 * problem, and nothing is saved. Only the meals in `eaten` are compared.
 */
export async function setMealTime(
  { settings }: Deps,
  slot: MealSlot,
  time: string,
  eaten: readonly MealSlot[],
): Promise<{ meal: MealSlot; before: MealSlot } | null> {
  const { mealTimeProblem } = await import("@cookto/engine/schedule");
  const times = { ...settings.mealTimes(), [slot]: time };
  const problem = mealTimeProblem(times, eaten);
  if (problem) return problem;
  settings.setMealTimes(times);
  return null;
}

/** A weekday the cook is off (0 is Sunday), or not any more. */
export function setDaysOff({ settings }: Deps, weekday: number, off: boolean) {
  const daysOff = settings.daysOff();
  const others = daysOff.weekdays.filter((d) => d !== weekday);
  settings.setDaysOff({
    ...daysOff,
    weekdays: (off ? [...others, weekday] : others).sort((a, b) => a - b),
  });
}

/** A single day off, "YYYY-MM-DD": "No cooking tomorrow" adds one too. */
export function addDayOff({ settings }: Deps, day: string) {
  const daysOff = settings.daysOff();
  if (daysOff.dates.includes(day)) return;
  settings.setDaysOff({ ...daysOff, dates: [...daysOff.dates, day].sort() });
}

export function removeDayOff({ settings }: Deps, day: string) {
  const daysOff = settings.daysOff();
  settings.setDaysOff({
    ...daysOff,
    dates: daysOff.dates.filter((d) => d !== day),
  });
}
