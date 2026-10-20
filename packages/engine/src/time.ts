// Moments as the API and people want them (specs/207). Its own entry,
// "@cookto/engine/time", so only the code that sends to the cook loads it.

/** A day at "HH:MM" in the household's own time, as the API wants it. */
export function dayAt(day: string, hhmm: string): string {
  return new Date(`${day}T${hhmm}:00`).toISOString();
}

/** A moment as people say it, "7:12 pm". */
export function timeWords(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .toLocaleLowerCase(locale);
}
