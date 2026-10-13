import { chooseLanguage } from "@cookto/usecases";
import { flushSync } from "react-dom";
import { useStore } from "zustand";
import { LOCALES, localeOf } from "../../i18n/index.js";
import { settings } from "../../platform.js";

/** The language picker's state and action (ADR 0022: the screen hook). */
export function useLanguagePicker() {
  const locale = localeOf(useStore(settings.store, (s) => s.language));
  const { messages } = LOCALES[locale];
  return {
    locale,
    label: messages.languageLabel,
    soon: messages.languageSoon,
    choose: (language: string) => {
      // Switch at once, in the same frame as the tap.
      flushSync(() => {
        chooseLanguage({ settings: settings.writer }, language);
      });
    },
  };
}
