import { useQuery } from "@tanstack/react-query";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { dishNeeds, useLoadedPacks } from "../../food.js";
import { pantryQuery, queries } from "../../platform.js";
import { open } from "../../routes.js";

/**
 * How many dishes the kitchen can make now, and a way to see them (#97).
 * Nothing when none: Today shows hope, not a zero.
 */
export function useCookNow() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const ready = dishNeeds(packs, items).filter((d) => d.needs === 0).length;
  if (ready === 0) return null;
  return {
    label: count(locale, t.canCookCount, ready),
    onOpen: () => {
      open("dishes");
    },
  };
}
