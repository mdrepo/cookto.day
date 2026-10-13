import { type PantryItem, pantryOrder } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useWords } from "../../i18n/useWords.js";
import { packStaples, useItemWords, useLoadedPacks } from "../../food.js";
import { pantryQuery, queries, today } from "../../platform.js";

/**
 * The pantry as the prototype's Fridge: "Use soon", "Fresh", "Staples", a
 * row per item; a row opens its sheet (DESIGN.md, the pantry list).
 */
export function usePantryScreen() {
  const { t } = useWords();
  const packs = useLoadedPacks();
  const words = useItemWords();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
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
    open,
    close: () => {
      setOpen(null);
    },
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
