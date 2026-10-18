import { use } from "react";
import { useStore } from "zustand";
import { settings } from "../platform.js";
import type { Messages } from "./en.js";
import { type Locale, localeOf, wordsOf } from "./index.js";

/**
 * The page's language and its words, for a screen hook. A language other
 * than English waits for its file (Suspense) the first time it's shown.
 */
export function useWords(): { locale: Locale; t: Messages } {
  const locale = localeOf(useStore(settings.store, (s) => s.language));
  const words = wordsOf(locale);
  return { locale, t: words instanceof Promise ? use(words) : words };
}
