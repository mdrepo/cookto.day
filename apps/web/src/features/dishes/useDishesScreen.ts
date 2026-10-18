import { MEAL_SLOTS, prepFor } from "@cookto/engine";
import { takeOutOfMyDishes } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  dishNeeds,
  listOf,
  namer,
  SLOT_WORDS,
  useKitchenSettings,
  useLoadedPacks,
  useMyPacks,
} from "../../food.js";
import { myDishes, pantryQuery, queries, settings } from "../../platform.js";
import { prepWords } from "../../prep.js";
import { open, openDish, useDishesWith } from "../../routes.js";

/**
 * My dishes (specs/175): the ones the kitchen can make now first, A to Z,
 * then the rest, fewest missing first (#97), then the child's own; or only
 * those using one food (#105). Each opens its page (#95), and can be taken
 * out.
 */
export function useDishesScreen() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const mine = useMyPacks();
  const { cuisines } = useKitchenSettings();
  const name = namer(packs, locale);
  const prep = prepWords(name, t, locale);
  const beans = useStore(settings.store, (s) => s.beans);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  // Narrowed to one food (#105): only the dishes that use it.
  const food = useDishesWith();
  const rows = dishNeeds(mine, items)
    .filter(({ dish }) => food === null || dish.ingredients.includes(food))
    .map(({ pack, dish, needs }) => ({
      needs,
      forChild: dish.for?.includes("child") ?? false,
      item: {
        key: `${pack}/${dish.id}`,
        name: name("dishes", dish.id),
        // Its meals, and its prep (specs/144): "Soak the chickpeas 8 hours before".
        line: [
          listOf(
            locale,
            MEAL_SLOTS.filter((s) => dish.slots.includes(s)).map(
              (s) => t[SLOT_WORDS[s]],
            ),
          ),
          ...prep.lines(prepFor(dish, beans)),
        ].join(" · "),
        end: needs === 0 ? t.hasEverything : count(locale, t.needsCount, needs),
        /** Its small photo's address, if it has one (specs/118). */
        photo: dish.photo?.small,
        onOpen: () => {
          openDish(pack, dish.id);
        },
        action: {
          label: t.takeOut,
          name: fill(t.takeOutDish, { dish: name("dishes", dish.id) }),
          run: () => void takeOutOfMyDishes({ myDishes }, dish.id),
        },
      },
    }))
    .sort(
      (a, b) =>
        a.needs - b.needs || a.item.name.localeCompare(b.item.name, locale),
    );
  const grown = rows.filter((r) => !r.forChild);
  return {
    // No cuisine loaded: no dishes, and the way to get some (#115).
    none:
      cuisines.length === 0
        ? {
            title: t.noDishesYet,
            body: t.noDishesBody,
            chooseLabel: t.chooseCuisines,
            choose: () => {
              open("cuisines");
            },
          }
        : null,
    title:
      food === null
        ? t.dishes
        : fill(t.withItem, { item: name("ingredients", food) }),
    // Dishes is a tab, so it has no Back; narrowed to one food, it has a
    // way back to every dish (#105).
    back:
      food === null
        ? null
        : {
            label: t.allDishes,
            run: () => {
              open("dishes");
            },
          },
    groups: [
      { title: t.cookNow, items: grown.filter((r) => r.needs === 0) },
      { title: t.needAFewThings, items: grown.filter((r) => r.needs > 0) },
      // The child's own dishes, their own group (specs/175, the owner's choice).
      { title: t.forTheChild, items: rows.filter((r) => r.forChild) },
    ].map((g) => ({ title: g.title, items: g.items.map((r) => r.item) })),
  };
}
