// When groceries go off. Pure functions: dates are "YYYY-MM-DD" strings in
// the household's own calendar, so time zones never shift a day.

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: "${isoDate}"`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/**
 * Days until something bought on `boughtOn`, which keeps `shelfLifeDays`,
 * goes off, counted from `today`. 0 means use it today; below 0, it has gone
 * off.
 */
export function daysLeft(
  boughtOn: string,
  shelfLifeDays: number,
  today: string,
): number {
  return dayNumber(boughtOn) + shelfLifeDays - dayNumber(today);
}

/** The day `n` days after `day` (before, when `n` is negative). */
export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * DAY_MS).toISOString().slice(0, 10);
}
