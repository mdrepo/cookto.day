import { useLayoutEffect } from "react";
import { useStore } from "zustand";
import { LOCALES, localeOf } from "../../i18n/index.js";
import { settings } from "../../platform.js";

/** Keeps the whole document's language and direction on the chosen language. */
export function useDocumentLanguage(): void {
  const locale = localeOf(useStore(settings.store, (s) => s.language));
  const { dir } = LOCALES[locale];
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
}
