import type { MealSlot } from "@cookto/engine";
import { keepTomorrow } from "@cookto/usecases";
import { useEffect } from "react";
import { namer, SLOT_WORDS } from "../../food.js";
import { useWords } from "../../i18n/useWords.js";
import { plans as planned } from "../../platform.js";
import { useMealPlans } from "./useMealPlans.js";

/**
 * Tomorrow, from 4 pm (specs/144): each meal's pick, kept as tonight's plan
 * so its prep can start and tomorrow morning shows the same.
 */
export function useTomorrow() {
  const { locale, t } = useWords();
  const m = useMealPlans();
  const picks: [MealSlot, string][] = (m?.tomorrow ?? []).flatMap((meal) => {
    const best = meal.suggestions[0];
    return best ? [[meal.slot, best.dish.id]] : [];
  });
  const unkept = picks.filter(
    ([slot]) => !m?.plans.some((p) => p.on === m.next && p.slot === slot),
  );
  const next = m?.next ?? "";
  const toKeep = JSON.stringify(Object.fromEntries(unkept));
  useEffect(() => {
    if (toKeep === "{}") return;
    void keepTomorrow(
      { plans: planned },
      next,
      JSON.parse(toKeep) as Partial<Record<MealSlot, string>>,
    );
  }, [next, toKeep]);
  if (!m?.tomorrow) return null;
  const name = namer(m.packs, locale);
  return {
    title: t.tomorrow,
    rows: picks.map(([slot, dish]) => ({
      key: slot,
      label: t[SLOT_WORDS[slot]],
      value: name("dishes", dish),
    })),
  };
}
