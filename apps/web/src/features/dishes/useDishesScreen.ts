import { MEAL_SLOTS } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  dishNeeds,
  listOf,
  namer,
  SLOT_WORDS,
  useLoadedPacks,
} from "../../food.js";
import { pantryQuery, queries } from "../../platform.js";
import { goHome, openDish } from "../../routes.js";

/**
 * The loaded cuisines' dishes: the ones the kitchen can make now first, A to
 * Z, then the rest, fewest missing first (#97). Each opens its page (#95).
 */
export function useDishesScreen() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const rows = dishNeeds(packs, items)
    .map(({ pack, dish, needs }) => ({
      needs,
      item: {
        key: `${pack}/${dish.id}`,
        name: name("dishes", dish.id),
        line: listOf(
          locale,
          MEAL_SLOTS.filter((s) => dish.slots.includes(s)).map(
            (s) => t[SLOT_WORDS[s]],
          ),
        ),
        end: needs === 0 ? t.hasEverything : count(locale, t.needsCount, needs),
        onOpen: () => {
          openDish(pack, dish.id);
        },
      },
    }))
    .sort(
      (a, b) =>
        a.needs - b.needs || a.item.name.localeCompare(b.item.name, locale),
    );
  return {
    title: t.dishes,
    back: t.back,
    onBack: goHome,
    ready: {
      title: t.cookNow,
      items: rows.filter((r) => r.needs === 0).map((r) => r.item),
    },
    rest: {
      title: t.needAFewThings,
      items: rows.filter((r) => r.needs > 0).map((r) => r.item),
    },
  };
}
