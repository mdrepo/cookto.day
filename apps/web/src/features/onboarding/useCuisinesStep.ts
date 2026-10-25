import { chooseCuisine } from "@cookto/usecases";
import { useStore } from "zustand";
import { cuisineName } from "../../cuisines.js";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { kitchen, packs, settings } from "../../platform.js";

/**
 * What do you cook (specs/263): the cuisines as the Cuisines page has them,
 * a tick each; one coming soon can't be ticked.
 */
export function useCuisinesStep() {
  const { locale, t } = useWords();
  const loaded = useStore(settings.store, (s) => s.kitchen.cuisines);
  return {
    none: loaded.length === 0 ? t.chooseAtLeastOne : null,
    cuisines: packs.cuisines().map((c) => {
      const on = loaded.includes(c.id);
      return {
        id: c.id,
        label: `${cuisineName(t, c.id)} · ${
          c.soon ? t.comingSoon : count(locale, t.dishCount, c.dishes)
        }`,
        pressed: on,
        disabled: c.soon,
        toggle: () => void chooseCuisine(kitchen, c.id, !on),
      };
    }),
  };
}
