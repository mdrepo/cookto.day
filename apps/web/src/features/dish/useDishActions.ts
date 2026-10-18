import { addDays, cookedOn } from "@cookto/engine";
import {
  addToList,
  cookedIt,
  didntMake,
  KEEP_DIFFERENT_DAYS,
  notCooked,
} from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SLOT_WORDS } from "../../food.js";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  cooked,
  cookedQuery,
  kitchen,
  plans as planned,
  plansQuery,
  queries,
  today,
} from "../../platform.js";

/**
 * What a dish's page can do: say it was cooked (specs/104), say a planned
 * meal wasn't made (specs/195), and put what it needs on the shopping list
 * (specs/103).
 */
export function useDishActions(dish: string | undefined, need: string[]) {
  const { locale, t } = useWords();
  const { data: history = [] } = useQuery(cookedQuery, queries);
  const { data: plans = [] } = useQuery(plansQuery, queries);
  // How many "Add to my list" just added.
  const [added, setAdded] = useState<number | null>(null);
  // Planned for a day that has passed, and counted as made (specs/195).
  const day = today();
  const plan = plans.find(
    (p) =>
      p.dish === dish &&
      !p.for &&
      p.on >= addDays(day, -KEEP_DIFFERENT_DAYS) &&
      p.on < day &&
      p.made !== "no" &&
      p.prep !== "skipped",
  );
  return {
    planned: plan
      ? {
          text: fill(t.plannedFor, {
            meal: t[SLOT_WORDS[plan.slot]].toLocaleLowerCase(locale),
            day: plan.on === addDays(day, -1) ? t.yesterdayLower : plan.on,
          }),
          label: t.didntMake,
          run: () => {
            void didntMake({ plans: planned }, plan.on, plan.slot);
          },
        }
      : null,
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
