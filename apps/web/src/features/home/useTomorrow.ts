import {
  type MealSlot,
  type MealSuggestions,
  prepEvents,
  type Suggestion,
} from "@cookto/engine";
import { keepTomorrow, sortTomorrow, swapTomorrow } from "@cookto/usecases";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { listOf, namer, SLOT_WORDS, useRole } from "../../food.js";
import { fill } from "../../i18n/format.js";
import type { Messages } from "../../i18n/en.js";
import { useWords } from "../../i18n/useWords.js";
import { plans as planned, settings } from "../../platform.js";
import { prepWords } from "../../prep.js";
import { openDish } from "../../routes.js";
import { send } from "../../share.js";
import { useMealPlans } from "./useMealPlans.js";

/** How many dishes each meal offers, the pick included. */
const SHOWN = 5;
/** From this time, tomorrow's plan stands as it is: silence is yes. */
const FIXED = "21:00";

type Plans = NonNullable<ReturnType<typeof useMealPlans>>;
type Namer = ReturnType<typeof namer>;

/** Each of tomorrow's meals: its pick, and other ideas that swap in. */
function mealsOf(m: Plans, name: Namer, t: Messages) {
  const packOf = new Map(
    m.packs.flatMap((p) => p.dishes.map((d) => [d.id, p.id] as const)),
  );
  return (m.tomorrow ?? []).flatMap(
    ({ slot, suggestions }: MealSuggestions) => {
      const [best, ...rest] = suggestions.slice(0, SHOWN);
      if (!best) return [];
      return [
        {
          slot,
          label: t[SLOT_WORDS[slot]],
          dish: name("dishes", best.dish.id),
          needs: best.needs,
          onOpen: () => {
            openDish(packOf.get(best.dish.id) ?? "", best.dish.id);
          },
          others: rest.map((s: Suggestion) => ({
            key: s.dish.id,
            name: name("dishes", s.dish.id),
            line: s.needs.length === 0 ? t.hasEverything : "",
            onOpen: () => {
              void swapTomorrow({ plans: planned }, m.next, slot, s.dish.id);
            },
          })),
        },
      ];
    },
  );
}

/** The plan as plain text, the same shape every day (criterion 4). */
function planText(
  m: Plans,
  meals: ReturnType<typeof mealsOf>,
  name: Namer,
  t: Messages,
  locale: string,
): string {
  const words = prepWords(name, t, locale);
  const lines = [
    t.tomorrow,
    ...meals.map((meal) => `${meal.label}: ${meal.dish}`),
    ...m.plans
      .filter((p) => p.on === m.next && p.for === "child")
      .map((p) => fill(t.forTheChildDish, { dish: name("dishes", p.dish) })),
    ...prepEvents({
      now: m.now,
      plans: m.plans,
      dishes: m.dishes,
      beans: m.beans,
    })
      .filter((e) => e.kind === "tonight")
      .map((e) =>
        fill(t.prepTonight, {
          do: words.doing(e.prep),
          meal: t[SLOT_WORDS[e.slot]].toLocaleLowerCase(locale),
        }),
      ),
  ];
  const needs = [...new Set(meals.flatMap((meal) => meal.needs))];
  if (needs.length > 0)
    lines.push(
      fill(t.buy, {
        items: listOf(
          locale,
          needs.map((id) => name("ingredients", id)),
        ),
      }),
    );
  return lines.join("\n");
}

/**
 * Tomorrow, on the planner's phone from 4 pm (specs/144, 195): each meal's
 * pick, with other ideas to swap in, "Looks good" and "Share tomorrow". Once
 * approved, or from 9 pm, it's sorted; "Change" opens it again. The picks are
 * kept as tonight's plan either way, so their prep can start and the cook's
 * morning shows the same.
 */
export function useTomorrow() {
  const { locale, t } = useWords();
  const role = useRole();
  const m = useMealPlans();
  const sortedOn = useStore(settings.store, (s) => s.sorted);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
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
  if (!m?.tomorrow || role !== "plan") return null;
  const name = namer(m.packs, locale);
  const meals = mealsOf(m, name, t);
  return {
    title: t.tomorrow,
    otherIdeas: t.otherIdeas,
    sorted: !editing && (sortedOn === next || m.now.slice(11) >= FIXED),
    sortedWords: t.tomorrowSorted,
    rows: meals.map((meal) => ({
      key: meal.slot,
      label: meal.label,
      value: meal.dish,
    })),
    meals,
    looksGood: {
      label: t.looksGood,
      run: () => {
        sortTomorrow({ settings: settings.writer }, next);
        setEditing(false);
      },
    },
    change: {
      label: t.change,
      run: () => {
        setEditing(true);
      },
    },
    share: {
      label: t.shareTomorrow,
      copied: copied ? t.copied : null,
      run: () => {
        void send(planText(m, meals, name, t, locale)).then((how) => {
          setCopied(how === "copied");
        });
      },
    },
  };
}
