import type { AppPack } from "@cookto/data";
import {
  cookToday,
  defaultMeals,
  plannedSlots,
  type Suggestion,
} from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { fill } from "../../i18n/format.js";
import type { Messages } from "../../i18n/en.js";
import { useWords } from "../../i18n/useWords.js";
import {
  assumedStaples,
  listOf,
  namer,
  SLOT_WORDS,
  useKitchenSettings,
  useLoadedPacks,
} from "../../food.js";
import { membersQuery, pantryQuery, queries, today } from "../../platform.js";

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

/** What to cook today, for each meal someone eats (specs/72, criteria 6 to 8). */
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
  const dishes = dishesOf(packs);
  if (dishes.length === 0) return null;
  const staples = assumedStaples(packs, items);
  const idea = (s: Suggestion) => ideaOf(s, name, t, locale);
  return {
    title: t.cookToday,
    otherIdeas: t.otherIdeas,
    meals: slots.flatMap((slot) => {
      const [best, ...rest] = cookToday({
        slot,
        dishes,
        pantry: items,
        staples,
        today: today(),
        skip: new Set(skip),
      })
        .slice(0, SHOWN)
        .map(idea);
      if (!best) return [];
      return [
        {
          slot,
          label: t[SLOT_WORDS[slot]],
          best,
          others: rest.map((o) => ({
            key: o.key,
            label: o.note ? `${o.dish} · ${o.note}` : o.dish,
            value: o.reasons.map((r) => r.text).join(" · "),
            quiet: o.reasons[0]?.tone !== "warm",
          })),
        },
      ];
    }),
  };
}
