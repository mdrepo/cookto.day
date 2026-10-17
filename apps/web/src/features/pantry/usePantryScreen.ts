import { type PantryItem, pantryOrder } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { bringBack } from "@cookto/usecases";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { packStaples, useItemWords, useLoadedPacks } from "../../food.js";
import { wantsAddFood } from "../../routes.js";
import { useKitchenSetup } from "../../setup.js";
import { kitchen, pantryQuery, queries, today } from "../../platform.js";

/**
 * The pantry as the prototype's Fridge: "Use soon", "Fresh", "Staples", a
 * row per item; a row opens its sheet (DESIGN.md, the pantry list).
 */
export function usePantryScreen() {
  const { t } = useWords();
  const packs = useLoadedPacks();
  const words = useItemWords();
  const [adding, setAdding] = useState(wantsAddFood);
  const [open, setOpen] = useState<string | null>(null);
  const setup = useKitchenSetup(() => {
    setAdding(true);
  });
  // Until there's fresh food, the steps show, with the next one as the main
  // button; "Add food" steps back to a quiet button (#115).
  const guiding = setup.known && !setup.hasFresh && !adding;
  // The last food used up, for "Onion used up · Undo" (#116). It goes when
  // they move on: another food, "Add food", or another page.
  const [usedUp, setUsedUp] = useState<{ id: string; name: string } | null>(
    null,
  );
  const staples = packStaples(packs);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const day = today();
  const row = (item: PantryItem) => {
    const w = words(item, day);
    return {
      key: item.id,
      name: w.name,
      line: staples.has(item.ingredient) ? undefined : w.line,
      end: staples.has(item.ingredient) ? (w.amount ?? t.haveIt) : w.warning,
      warn: w.warning !== null,
      onOpen: () => {
        setUsedUp(null);
        setOpen(item.id);
      },
    };
  };
  const fresh = pantryOrder(
    items.filter((i) => !staples.has(i.ingredient)),
    day,
  ).map(row);
  return {
    title: t.pantry,
    groups: [
      { key: "soon", label: t.useSoon, rows: fresh.filter((r) => r.warn) },
      { key: "fresh", label: t.fresh, rows: fresh.filter((r) => !r.warn) },
      {
        key: "staples",
        label: t.staples,
        rows: items.filter((i) => staples.has(i.ingredient)).map(row),
      },
    ].filter((g) => g.rows.length > 0),
    setup,
    guiding,
    open,
    close: () => {
      setOpen(null);
    },
    onUsedUp: (id: string, name: string) => {
      setUsedUp({ id, name });
    },
    undo: usedUp && {
      text: fill(t.usedUpNote, { food: usedUp.name }),
      label: t.undo,
      run: () => {
        setUsedUp(null);
        void bringBack(kitchen, usedUp.id);
      },
    },
    add: {
      label: t.addFood,
      adding,
      start: () => {
        setUsedUp(null);
        setAdding(true);
      },
      done: () => {
        setAdding(false);
      },
    },
  };
}
