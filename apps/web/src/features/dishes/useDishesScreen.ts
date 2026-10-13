import { MEAL_SLOTS } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  assumedStaples,
  listOf,
  namer,
  SLOT_WORDS,
  useLoadedPacks,
} from "../../food.js";
import { pantryQuery, queries } from "../../platform.js";
import { goHome } from "../../routes.js";

/** The loaded cuisines' dishes: the meals each suits, and what it needs. */
export function useDishesScreen() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const have = new Set(items.map((i) => i.ingredient));
  const staples = assumedStaples(packs, items);
  return {
    title: t.dishes,
    back: t.back,
    onBack: goHome,
    rows: packs.flatMap((pack) =>
      pack.dishes.map((dish) => {
        const needs = dish.ingredients.filter(
          (i) => !have.has(i) && !staples.has(i),
        ).length;
        const meals = MEAL_SLOTS.filter((s) => dish.slots.includes(s)).map(
          (s) => t[SLOT_WORDS[s]],
        );
        return {
          key: `${pack.id}/${dish.id}`,
          label: name("dishes", dish.id),
          value: `${listOf(locale, meals)} · ${
            needs === 0 ? t.hasEverything : count(locale, t.needsCount, needs)
          }`,
          quiet: needs > 0,
        };
      }),
    ),
  };
}
