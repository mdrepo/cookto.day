import type { AppPack } from "@cookto/data";
import {
  cookedLately,
  cookedOn,
  cookTodayForMeals,
  defaultMeals,
  plannedSlots,
  type Suggestion,
} from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { fill } from "../../i18n/format.js";
import type { Messages } from "../../i18n/en.js";
import { useWords } from "../../i18n/useWords.js";
import {
  staplesToAssume,
  listOf,
  namer,
  SLOT_WORDS,
  useKitchenSettings,
  useLoadedPacks,
} from "../../food.js";
import { cookedIt, notCooked, KEEP_DIFFERENT_DAYS } from "@cookto/usecases";
import {
  cooked,
  cookedQuery,
  membersQuery,
  pantryQuery,
  queries,
  today,
} from "../../platform.js";
import { openDish } from "../../routes.js";

/** How many dishes each meal suggests. */
const SHOWN = 5;
/** How much of the pantry a suggestion names: what needs using most. */
const USES_SHOWN = 2;

const dishesOf = (packs: readonly AppPack[]) => packs.flatMap((p) => p.dishes);

/** One suggestion in words: the dish, what it's served with, and why. */
function ideaOf(
  s: Suggestion,
  name: ReturnType<typeof namer>,
  t: Messages,
  locale: string,
) {
  const food = (ids: readonly string[]) =>
    listOf(
      locale,
      ids.map((id) => name("ingredients", id)),
    );
  const served = s.servedWith.map((p) => name("parts", p));
  return {
    key: s.dish.id,
    dish: name("dishes", s.dish.id),
    note:
      served.length > 0
        ? fill(t.servedWith, {
            items: listOf(locale, served, "disjunction"),
          })
        : "",
    reasons: [
      ...(s.uses.length > 0
        ? [
            {
              key: "uses",
              text: fill(t.uses, {
                items: food(s.uses.slice(0, USES_SHOWN)),
              }),
              tone: "warm" as const,
            },
          ]
        : []),
      s.needs.length > 0
        ? {
            key: "needs",
            text: fill(t.needs, { items: food(s.needs) }),
            tone: "quiet" as const,
          }
        : { key: "has", text: t.hasEverything, tone: "good" as const },
    ],
  };
}

/**
 * What to cook today, for each meal someone eats (specs/72, criteria 6 to 8),
 * a different dish for each when there's more than one (specs/94).
 */
export function useCookToday() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const { skip } = useKitchenSettings();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const { data: planned = [] } = useQuery(
    { ...membersQuery, select: plannedSlots },
    queries,
  );
  // Nobody saved yet (a sample, or onboarding skipped): one adult's meals.
  const slots = planned.length > 0 ? planned : defaultMeals("adult");
  const { data: history = [] } = useQuery(cookedQuery, queries);
  const day = today();
  // Cooked in the last days, not today: no meal's pick (specs/104).
  const avoid = cookedLately(history, day, KEEP_DIFFERENT_DAYS);
  const cookedToday = cookedOn(history, day);
  const dishes = dishesOf(packs);
  if (dishes.length === 0) return null;
  const staples = staplesToAssume(packs, items);
  const packOf = new Map(
    packs.flatMap((p) => p.dishes.map((d) => [d.id, p.id] as const)),
  );
  const idea = (s: Suggestion) => ({
    ...ideaOf(s, name, t, locale),
    onOpen: () => {
      openDish(packOf.get(s.dish.id) ?? "", s.dish.id);
    },
  });
  return {
    title: t.cookToday,
    otherIdeas: t.otherIdeas,
    weCookedThis: t.weCookedThis,
    cookedTodayWords: t.cookedToday,
    undo: t.undo,
    meals: cookTodayForMeals({
      slots,
      dishes,
      pantry: items,
      staples,
      today: day,
      skip: new Set(skip),
      avoid,
    }).flatMap(({ slot, suggestions }) => {
      const [best, ...rest] = suggestions.slice(0, SHOWN).map(idea);
      if (!best) return [];
      return [
        {
          slot,
          label: t[SLOT_WORDS[slot]],
          best,
          cooked: cookedToday.has(best.key),
          onCooked: () => {
            void cookedIt({ cooked }, best.key, day);
          },
          onUndo: () => {
            void notCooked({ cooked }, best.key, day);
          },
          others: rest.map((o) => ({
            key: o.key,
            name: o.dish,
            line: [o.note, ...o.reasons.map((r) => r.text)]
              .filter(Boolean)
              .join(" · "),
            onOpen: o.onOpen,
          })),
        },
      ];
    }),
  };
}
