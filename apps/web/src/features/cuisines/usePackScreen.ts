import { MEAL_SLOTS } from "@cookto/engine";
import {
  addToMyDishes,
  loadCuisine,
  takeOutOfMyDishes,
} from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listOf, namer, SLOT_WORDS } from "../../food.js";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  kitchen,
  myDishes,
  packQuery,
  queries,
  takenOutQuery,
} from "../../platform.js";
import { goBack, openDish, usePackId } from "../../routes.js";
import { cuisineName } from "./names.js";

/**
 * A pack's dishes (specs/175): a library to pick from. Opening it the first
 * time puts all its dishes in My dishes; each is "In My dishes", with "Take
 * out", or has "Add". Each opens its page.
 */
export function usePackScreen() {
  const { locale, t } = useWords();
  const id = usePackId() ?? "";
  // The first open loads the pack: every dish of it is in My dishes.
  useEffect(() => {
    if (id) void loadCuisine(kitchen, id);
  }, [id]);
  const { data: pack } = useQuery(
    { ...packQuery(id), enabled: id !== "" },
    queries,
  );
  const { data: out = [] } = useQuery(takenOutQuery, queries);
  const name = namer(pack ? [pack] : [], locale);
  const k = { myDishes };
  const items = (pack?.dishes ?? [])
    .map((dish) => {
      const title = name("dishes", dish.id);
      const mine = !out.includes(dish.id);
      return {
        key: dish.id,
        name: title,
        line: listOf(
          locale,
          MEAL_SLOTS.filter((s) => dish.slots.includes(s)).map(
            (s) => t[SLOT_WORDS[s]],
          ),
        ),
        mine,
        onOpen: () => {
          openDish(pack?.id ?? id, dish.id);
        },
        action: mine
          ? {
              label: t.takeOut,
              name: fill(t.takeOutDish, { dish: title }),
              run: () => void takeOutOfMyDishes(k, dish.id),
            }
          : {
              label: t.add,
              name: fill(t.addDish, { dish: title }),
              run: () => void addToMyDishes(k, dish.id),
            },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return {
    title: cuisineName(t, id),
    back: { label: t.back, run: goBack },
    listLabel: t.packDishes,
    inMyDishes: t.inMyDishes,
    items,
  };
}
