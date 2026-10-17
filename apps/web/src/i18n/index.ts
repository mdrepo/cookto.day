import { en, type Messages } from "./en.js";

// The languages the app has words for (ADR 0012). Each is named in its own
// script, so people can find theirs whatever the page is showing. A language
// that's coming soon can't be chosen until a native speaker has read it; a
// reviewer sees it with ?preview-language= (specs/65-onboarding.md).
// English comes with the first page; the others load when someone picks
// them, so a first visit doesn't carry words it won't show (ADR 0013).
export const LOCALES = {
  en: { name: "English", dir: "ltr", soon: false },
  hi: { name: "हिन्दी", dir: "ltr", soon: true },
  mr: { name: "मराठी", dir: "ltr", soon: true },
  ar: { name: "العربية", dir: "rtl", soon: true },
} as const satisfies Record<
  string,
  { name: string; dir: "ltr" | "rtl"; soon: boolean }
>;

export type Locale = keyof typeof LOCALES;

export function isLocale(value: string | null): value is Locale {
  return value !== null && Object.hasOwn(LOCALES, value);
}

/** A saved language as one the app speaks: English when it isn't. */
export function localeOf(value: string | null): Locale {
  return isLocale(value) ? value : "en";
}

const LOADERS: Record<Exclude<Locale, "en">, () => Promise<Messages>> = {
  hi: () => import("./hi.js").then((m) => m.hi),
  mr: () => import("./mr.js").then((m) => m.mr),
  ar: () => import("./ar.js").then((m) => m.ar),
};

// Each language's file, once asked for: the same promise every time, as
// React's `use` needs.
const asked = new Map<Locale, Promise<Messages>>();

/** A language's words: English at once, the others once their file loads. */
export function wordsOf(locale: Locale): Messages | Promise<Messages> {
  if (locale === "en") return en;
  let words = asked.get(locale);
  if (!words) {
    words = LOADERS[locale]();
    asked.set(locale, words);
  }
  return words;
}
