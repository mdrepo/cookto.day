import { addDays, type DaysOff } from "@cookto/engine";
import { dayWords } from "@cookto/engine/time";
import type { Messages } from "../../i18n/en.js";
import { fill } from "../../i18n/format.js";

// The cook's days off in words (specs/240): "Off Sundays and 25 Oct". The
// week starts on Monday here, as the household's calendar does.

/** The weekdays in the order shown, 0 being Sunday. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

const EVERY = [
  "sundays",
  "mondays",
  "tuesdays",
  "wednesdays",
  "thursdays",
  "fridays",
  "saturdays",
] as const satisfies readonly (keyof Messages)[];

/** English dates read "25 Oct", as people here write them. */
const datesLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);

/** "25 Oct", from "YYYY-MM-DD". */
export const shortDate = (day: string, locale: string) =>
  dayWords(day, datesLocale(locale), { day: "numeric", month: "short" });

/** "Sunday 25 Oct", from "YYYY-MM-DD". */
export const longDate = (day: string, locale: string) =>
  dayWords(day, datesLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

/** "Sunday", from 0. 4 January 1970 was a Sunday. */
export const weekdayName = (weekday: number, locale: string) =>
  dayWords(addDays("1970-01-04", weekday), locale, { weekday: "long" });

/** "Off Saturdays, Sundays and 25 Oct", or null when she has none. */
export function offWords(
  daysOff: DaysOff,
  t: Messages,
  locale: string,
): string | null {
  const days = [
    ...WEEK.filter((d) => daysOff.weekdays.includes(d)).map((d) => t[EVERY[d]]),
    ...daysOff.dates.map((d) => shortDate(d, locale)),
  ];
  if (days.length === 0) return null;
  const list = new Intl.ListFormat(datesLocale(locale), {
    type: "conjunction",
  }).format(days);
  return fill(t.offDays, { days: list });
}
