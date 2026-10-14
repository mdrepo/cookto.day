import { THEMES, type Theme } from "@cookto/data";
import { chooseTheme } from "@cookto/usecases";
import { flushSync } from "react-dom";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

const WORDS = {
  system: "themeSystem",
  light: "themeLight",
  dark: "themeDark",
} as const;

/** The theme picker's state and action (specs/96; ADR 0022). */
export function useThemePicker() {
  const { t } = useWords();
  const theme = useStore(settings.store, (s) => s.theme);
  return {
    theme,
    label: t.theme,
    options: THEMES.map((value) => ({ value, label: t[WORDS[value]] })),
    choose: (value: string) => {
      const chosen = THEMES.find((v) => v === value);
      if (!chosen) return;
      // Switch at once, in the same frame as the tap.
      flushSync(() => {
        chooseTheme({ settings: settings.writer }, chosen satisfies Theme);
      });
    },
  };
}
