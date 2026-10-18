import { cookedOn, type MealSlot, type Suggestion } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { fill } from "../../i18n/format.js";
import type { Messages } from "../../i18n/en.js";
import { useWords } from "../../i18n/useWords.js";
import { listOf, namer, SLOT_WORDS, useRole } from "../../food.js";
import { cookedIt, notCooked } from "@cookto/usecases";
import { cooked, cookedQuery, queries } from "../../platform.js";
import { openDish } from "../../routes.js";
import { useMealPlans } from "./useMealPlans.js";

/** How many dishes each meal suggests. */
const SHOWN = 5;
/** How much of the pantry a suggestion names: what needs using most. */
const USES_SHOWN = 2;

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
 * a different dish for each when there's more than one (specs/94); a meal
 * planned the evening before keeps its dish (specs/144), and is decided:
 * no other ideas on the cook's phone, whose tap is "Made" (specs/195).
 */
export function useCookToday() {
  const { locale, t } = useWords();
  const role = useRole();
  const plans = useMealPlans();
  const { data: history = [] } = useQuery(cookedQuery, queries);
  if (!plans) return null;
  const { packs, day } = plans;
  const name = namer(packs, locale);
  const cookedToday = cookedOn(history, day);
  const packOf = new Map(
    packs.flatMap((p) => p.dishes.map((d) => [d.id, p.id] as const)),
  );
  // Small round fruit, for a toddler: cut in half (specs/145).
  const toddler = plans.members.some((x) => x.kind === "toddler");
  const cut = new Set(plans.dishes.filter((d) => d.cut).map((d) => d.id));
  const idea = (s: Suggestion, slot: MealSlot) => {
    const words = ideaOf(s, name, t, locale);
    return {
      ...words,
      reasons:
        toddler && cut.has(s.dish.id)
          ? [
              ...words.reasons,
              { key: "cut", text: t.cutInHalf, tone: "warm" as const },
            ]
          : words.reasons,
      onOpen: () => {
        openDish(packOf.get(s.dish.id) ?? "", s.dish.id, { slot });
      },
    };
  };
  return {
    title: t.cookToday,
    otherIdeas: t.otherIdeas,
    madeLabel: t.made,
    madeWords: t.made,
    undo: t.undo,
    /** The planner's phone marks nothing: they decide tomorrow (specs/195). */
    canMark: role === "cook",
    meals: plans.today.flatMap(({ slot, suggestions }) => {
      const [best, ...rest] = suggestions
        .slice(0, SHOWN)
        .map((s) => idea(s, slot));
      if (!best) return [];
      const decided =
        role === "cook" &&
        plans.plans.some(
          (p) =>
            p.on === day && p.slot === slot && !p.for && p.prep !== "skipped",
        );
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
          others: (decided ? [] : rest).map((o) => ({
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
