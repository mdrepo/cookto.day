import { chooseLanguage } from "@cookto/usecases";
import { flushSync } from "react-dom";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

/** The language picker's state and action (ADR 0022: the screen hook). */
export function useLanguagePicker() {
  const { locale, t } = useWords();
  return {
    locale,
    label: t.languageLabel,
    soon: t.languageSoon,
    choose: (language: string) => {
      // Switch at once, in the same frame as the tap.
      flushSync(() => {
        chooseLanguage({ settings: settings.writer }, language);
      });
    },
  };
}
