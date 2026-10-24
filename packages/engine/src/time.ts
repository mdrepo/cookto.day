// Moments as the API and people want them (specs/207). Its own entry,
// "@cookto/engine/time", so only the code that sends to the cook loads it.

/** A day at "HH:MM" in the household's own time, as the API wants it. */
export function dayAt(day: string, hhmm: string): string {
  return new Date(`${day}T${hhmm}:00`).toISOString();
}

/** Old names some browsers still give a zone, and the name IANA uses now. */
const ZONE_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Dacca": "Asia/Dhaka",
};

/** A time zone by the name IANA uses now: "Asia/Kolkata", not "Asia/Calcutta". */
export const zoneName = (zone: string) => ZONE_NAMES[zone] ?? zone;

/**
 * A moment on a household's own clock (specs/240): its day, "YYYY-MM-DD",
 * and its time, "HH:MM", in that time zone, as the server reads it.
 */
export function clockIn(
  timeZone: string,
  iso: string,
): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

/** A day, "YYYY-MM-DD", in words: "25 Oct", "Sunday" (specs/240). */
export function dayWords(
  day: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** A moment as people say it, "7:12 pm". */
export function timeWords(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .toLocaleLowerCase(locale);
}
