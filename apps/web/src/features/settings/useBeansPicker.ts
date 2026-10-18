import { BEANS } from "@cookto/data";
import { chooseBeans } from "@cookto/usecases";
import { useStore } from "zustand";
import { useWords } from "../../i18n/useWords.js";
import { settings } from "../../platform.js";

const WORDS = {
  dried: { title: "driedBeans", line: "driedBeansLine" },
  tinned: { title: "tinnedBeans", line: "tinnedBeansLine" },
} as const;

/** Dried or tinned beans (specs/144): tinned need no soaking. */
export function useBeansPicker() {
  const { t } = useWords();
  const beans = useStore(settings.store, (s) => s.beans);
  return {
    beans,
    label: t.beans,
    options: BEANS.map((value) => ({
      value,
      title: t[WORDS[value].title],
      detail: t[WORDS[value].line],
    })),
    choose: (value: string) => {
      const chosen = BEANS.find((v) => v === value);
      if (chosen) chooseBeans({ settings: settings.writer }, chosen);
    },
  };
}
