import type { AppPack } from "@cookto/data";
import { cookToday, plannedSlots } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { fill } from "../../i18n/format.js";
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

const dishesOf = (packs: readonly AppPack[]) => packs.flatMap((p) => p.dishes);

/** What to cook today, for each meal someone eats (specs/72, criteria 6 to 8). */
export function useCookToday() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const { skip } = useKitchenSettings();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const { data: slots = [] } = useQuery(
    { ...membersQuery, select: plannedSlots },
    queries,
  );
  const dishes = dishesOf(packs);
  if (dishes.length === 0) return null;
  const staples = assumedStaples(packs, items);
  const food = (ids: readonly string[]) =>
    listOf(
      locale,
      ids.map((id) => name("ingredients", id)),
    );
  return {
    title: t.cookToday,
    meals: slots.map((slot) => ({
      slot,
      title: t[SLOT_WORDS[slot]],
      rows: cookToday({
        slot,
        dishes,
        pantry: items,
        staples,
        today: today(),
        skip: new Set(skip),
      })
        .slice(0, SHOWN)
        .map((s) => {
          const served = s.servedWith.map((p) => name("parts", p));
          const dish = name("dishes", s.dish.id);
          return {
            key: s.dish.id,
            label:
              served.length > 0
                ? `${dish} · ${fill(t.servedWith, { items: listOf(locale, served, "disjunction") })}`
                : dish,
            value: [
              s.uses.length > 0 ? fill(t.uses, { items: food(s.uses) }) : "",
              s.needs.length > 0 ? fill(t.needs, { items: food(s.needs) }) : "",
            ]
              .filter(Boolean)
              .join(" · "),
            quiet: s.uses.length === 0,
          };
        }),
    })),
  };
}
