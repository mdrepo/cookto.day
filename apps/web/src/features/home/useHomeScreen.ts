import { useStore } from "zustand";
import { LOCALES, localeOf } from "../../i18n/index.js";
import { settings } from "../../platform.js";

/** The home screen's words, in the chosen language (ADR 0022: the screen hook). */
export function useHomeScreen() {
  const locale = localeOf(useStore(settings.store, (s) => s.language));
  return LOCALES[locale].messages;
}
