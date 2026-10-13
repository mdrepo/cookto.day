import { COUNTRIES, type Country } from "@cookto/engine";
import { chooseCountry } from "@cookto/usecases";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

/** Where the household lives: a card per country, with its currency and shops. */
export function useWhereStep() {
  const { t } = useWords();
  const country = useStore(settings.store, (s) => s.country);
  const names: Record<Country, string> = {
    SG: t.singapore,
    IN: t.india,
    AE: t.uae,
  };
  return {
    legend: t.whereTitle,
    value: country,
    options: (Object.keys(COUNTRIES) as Country[]).map((code) => {
      const { currency, shops, soon } = COUNTRIES[code];
      const option = {
        value: code,
        title: names[code],
        detail: [currency, ...shops].join(" · "),
      };
      return soon ? { ...option, soon: t.comingSoon } : option;
    }),
    choose: (code: string) => {
      chooseCountry({ settings: settings.writer }, code);
    },
  };
}
