import { type DaysOff, MEAL_TIMES, type MealTimes } from "@cookto/engine";

// The household's schedule (specs/240): its time zone, when it eats each
// meal, and the cook's days off. Kept with the settings, saved on this
// phone under one key, and synced in the household's settings record
// (./household-settings, which checks a copy from another phone).

export const SCHEDULE_KEY = "cookto.day:schedule";

export interface Schedule {
  /** The household's clock: the phone's that started it; null until then. */
  timeZone: string | null;
  mealTimes: MealTimes;
  daysOff: DaysOff;
}

/**
 * The schedule as this phone saved it, or each part's start. Only this
 * phone writes the key, from a schedule already checked.
 */
export function startSchedule(text: string | null): Schedule {
  try {
    const v = JSON.parse(text ?? "{}") as Partial<Schedule>;
    return {
      timeZone: v.timeZone ?? null,
      mealTimes: { ...MEAL_TIMES, ...v.mealTimes },
      daysOff: v.daysOff ?? { weekdays: [], dates: [] },
    };
  } catch {
    return startSchedule(null);
  }
}
