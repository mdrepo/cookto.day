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

const minutesOf = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * The moment it's `hhmm` on `day` in the household's time (specs/270: an
 * hour before the day's first meal), from `now` in milliseconds; null
 * without a clock.
 */
export function whenLocal(
  s: Schedule,
  now: number,
  day: string,
  hhmm: string,
): string | null {
  const clock = clockOf(s, new Date(now).toISOString());
  if (!clock) return null;
  const days = (Date.parse(day) - Date.parse(clock.day)) / 86_400_000;
  const minutes = days * 1440 + minutesOf(hhmm) - minutesOf(clock.time);
  return new Date(now - (now % 60_000) + minutes * 60_000).toISOString();
}

/** "1 pm" from "13:00", "10:04 pm" from "22:04", as the bot says it. */
export function hourWords(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${String(twelve)}${m === "00" ? "" : `:${m}`} ${h < 12 ? "am" : "pm"}`;
}

/** The household's day and time at `iso`; null when it has no clock yet. */
export function clockOf(
  s: Schedule,
  iso: string,
): { day: string; time: string } | null {
  return s.timeZone === null ? null : clockIn(s.timeZone, iso);
}
