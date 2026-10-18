import { chooseRole } from "@cookto/usecases";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

/** Who cooks (specs/195): this phone is the cook's, or the planner's. */
export function useCooksStep() {
  const { t } = useWords();
  const role = useStore(settings.store, (s) => s.role);
  return {
    legend: t.whoCooks,
    value: role,
    options: [
      { value: "cook", title: t.iCook, detail: t.iCookLine },
      { value: "plan", title: t.someoneElseCooks, detail: t.someoneElseLine },
    ],
    choose: (value: string) => {
      if (value === "cook" || value === "plan")
        chooseRole({ settings: settings.writer }, value);
    },
  };
}
