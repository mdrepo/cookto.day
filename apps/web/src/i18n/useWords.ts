import { useStore } from "zustand";
import { settings } from "../platform.js";
import { LOCALES, type Locale, localeOf } from "./index.js";

/** The page's language and its words, for a screen hook. */
export function useWords(): {
  locale: Locale;
  t: (typeof LOCALES)[Locale]["messages"];
} {
  const locale = localeOf(useStore(settings.store, (s) => s.language));
  return { locale, t: LOCALES[locale].messages };
}
