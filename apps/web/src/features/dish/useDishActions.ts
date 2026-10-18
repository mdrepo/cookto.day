import { cookedOn } from "@cookto/engine";
import { addToList, cookedIt, notCooked } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  cooked,
  cookedQuery,
  kitchen,
  queries,
  today,
} from "../../platform.js";

/**
 * What a dish's page can do: say it was cooked (specs/104), and put what it
 * needs on the shopping list (specs/103).
 */
export function useDishActions(dish: string | undefined, need: string[]) {
  const { locale, t } = useWords();
  const { data: history = [] } = useQuery(cookedQuery, queries);
  // How many "Add to my list" just added.
  const [added, setAdded] = useState<number | null>(null);
  return {
    weCookedThis: t.weCookedThis,
    cookedToday: cookedOn(history, today()).has(dish ?? "")
      ? t.cookedToday
      : null,
    onCooked: () => {
      if (dish) void cookedIt({ cooked }, dish, today());
    },
    undo: t.undo,
    onUndo: () => {
      if (dish) void notCooked({ cooked }, dish, today());
    },
    addToList:
      need.length > 0
        ? {
            label: t.addToList,
            added: added === null ? null : count(locale, t.addedToList, added),
            run: () => {
              void addToList(kitchen, need).then(setAdded);
            },
          }
        : null,
  };
}
