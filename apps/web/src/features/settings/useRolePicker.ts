import { chooseRole } from "@cookto/usecases";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

/** Who cooks (specs/195): this phone plans the meals, or cooks them. */
export function useRolePicker() {
  const { t } = useWords();
  const role = useStore(settings.store, (s) => s.role);
  return {
    role,
    label: t.whoCooksSetting,
    options: [
      { value: "plan", title: t.iPlanMeals, detail: t.someoneElseLine },
      { value: "cook", title: t.iCookMeals, detail: t.iCookLine },
    ],
    choose: (value: string) => {
      if (value === "cook" || value === "plan")
        chooseRole({ settings: settings.writer }, value);
    },
  };
}
