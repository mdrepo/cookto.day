import { ar } from "./ar.js";
import { en, type Messages } from "./en.js";
import { hi } from "./hi.js";
import { mr } from "./mr.js";

// The languages the app has words for (ADR 0012). Each is named in its own
// script, so people can find theirs whatever the page is showing. A language
// that's coming soon can't be chosen until a native speaker has read it; a
// reviewer sees it with ?preview-language= (specs/65-onboarding.md).
export const LOCALES = {
  en: { name: "English", dir: "ltr", messages: en, soon: false },
  hi: { name: "हिन्दी", dir: "ltr", messages: hi, soon: true },
  mr: { name: "मराठी", dir: "ltr", messages: mr, soon: true },
  ar: { name: "العربية", dir: "rtl", messages: ar, soon: true },
} as const satisfies Record<
  string,
  { name: string; dir: "ltr" | "rtl"; messages: Messages; soon: boolean }
>;

export type Locale = keyof typeof LOCALES;

export function isLocale(value: string | null): value is Locale {
  return value !== null && Object.hasOwn(LOCALES, value);
}

/** A saved language as one the app speaks: English when it isn't. */
export function localeOf(value: string | null): Locale {
  return isLocale(value) ? value : "en";
}
