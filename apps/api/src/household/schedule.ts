import type { Households } from "@cookto/db";
import {
  type DaysOff,
  MEAL_SLOTS,
  MEAL_TIMES,
  type MealSlot,
  type MealTimes,
} from "@cookto/engine";
import { clockIn } from "@cookto/engine/time";

// A household's schedule (specs/240), read from the records its phones
// sync: the settings record's time zone, meal times and days off, and the
// meals its people eat. The server reads it for the workflows; it never
// writes it. A household with no settings record has no time zone, so no
// clock, and nothing is ever due for it.

export interface Schedule {
  timeZone: string | null;
  mealTimes: MealTimes;
  /** The meals at least one person eats, in the day's order. */
  slots: MealSlot[];
  daysOff: DaysOff;
  /** The day whose plan was approved, "YYYY-MM-DD" (specs/241). */
  sorted: string | null;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isSlot = (s: unknown): s is MealSlot =>
  (MEAL_SLOTS as readonly unknown[]).includes(s);
const live = (r: Record<string, unknown>) =>
  r.deletedAt === null || r.deletedAt === undefined;

export async function schedule(
  households: Households,
  household: string,
): Promise<Schedule> {
  const [settings] = (
    await households.records(household, "household-settings")
  ).filter(live);
  const people = (await households.records(household, "members")).filter(live);
  const eaten = new Set(
    people.flatMap((p): unknown[] => (Array.isArray(p.meals) ? p.meals : [])),
  );
  const times = (settings?.mealTimes ?? {}) as Record<string, unknown>;
  const off = (settings?.daysOff ?? {}) as Record<string, unknown>;
  const mealTimes = { ...MEAL_TIMES };
  for (const slot of MEAL_SLOTS) {
    const t = times[slot];
    if (typeof t === "string" && HHMM.test(t)) mealTimes[slot] = t;
  }
  return {
    timeZone: typeof settings?.timeZone === "string" ? settings.timeZone : null,
    mealTimes,
    slots: MEAL_SLOTS.filter((s) => isSlot(s) && eaten.has(s)),
    daysOff: {
      weekdays: Array.isArray(off.weekdays)
        ? off.weekdays.filter((d): d is number => Number.isInteger(d))
        : [],
      dates: Array.isArray(off.dates)
        ? off.dates.filter((d): d is string => typeof d === "string")
        : [],
    },
    sorted: typeof settings?.sorted === "string" ? settings.sorted : null,
  };
}

/** The household's day and time at `iso`; null when it has no clock yet. */
export function clockOf(
  s: Schedule,
  iso: string,
): { day: string; time: string } | null {
  return s.timeZone === null ? null : clockIn(s.timeZone, iso);
}
