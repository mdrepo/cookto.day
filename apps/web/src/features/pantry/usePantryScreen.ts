import { pantryOrder } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import {
  namer,
  packStaples,
  useAmountWords,
  useLoadedPacks,
} from "../../food.js";
import { pantryQuery, queries, today } from "../../platform.js";
import { goHome } from "../../routes.js";

/**
 * The pantry: fresh food first, what needs using at the top, then staples
 * (DESIGN.md, the pantry list). Fresh rows are ids only: each card reads its
 * own item.
 */
export function usePantryScreen() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const amountOf = useAmountWords();
  const [adding, setAdding] = useState(false);
  const staples = packStaples(packs);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const fresh = pantryOrder(
    items.filter((i) => !staples.has(i.ingredient)),
    today(),
  ).map((i) => i.id);
  return {
    title: t.pantry,
    back: t.back,
    onBack: goHome,
    freshTitle: t.fresh,
    fresh,
    staplesTitle: t.staples,
    staples: items
      .filter((i) => staples.has(i.ingredient))
      .map((i) => ({
        key: i.id,
        label: name("ingredients", i.ingredient),
        value: amountOf(i) ?? t.haveIt,
      })),
    add: {
      label: t.addFood,
      adding,
      start: () => {
        setAdding(true);
      },
      done: () => {
        setAdding(false);
      },
    },
  };
}
