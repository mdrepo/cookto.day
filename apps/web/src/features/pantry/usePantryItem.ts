import {
  type Condition,
  CONDITIONS,
  conditionOf,
  daysLeft,
} from "@cookto/engine";
import {
  changeAmount,
  markFood,
  // A use case, not a React hook: it marks food used up.
  useUp as markUsedUp,
} from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { namer, useAmountWords, useLoadedPacks } from "../../food.js";
import { kitchen, pantryQuery, queries, today } from "../../platform.js";
import { toGramsOrMl, UNIT_CHOICES } from "./units.js";

const CONDITION_WORDS = {
  good: "good",
  "use-soon": "useSoon",
  "past-its-best": "pastItsBest",
} as const satisfies Record<Condition, string>;

/**
 * One fresh item's card. It selects only that item, so a change to another
 * leaves it as it was (ADR 0023, specs/72 criterion 11).
 */
export function usePantryItem(id: string) {
  const { locale, t } = useWords();
  const name = namer(useLoadedPacks(), locale);
  const amountOf = useAmountWords();
  const [editing, setEditing] = useState(false);
  const { data: item } = useQuery(
    {
      ...pantryQuery,
      select: (items) => items.find((i) => i.id === id) ?? null,
    },
    queries,
  );
  if (!item) return null;
  const day = today();
  const condition = conditionOf(item, day);
  const amount = amountOf(item);
  const left =
    item.shelfLifeDays === undefined
      ? null
      : daysLeft(item.boughtOn, item.shelfLifeDays, day);
  const useBy =
    left === null || left < 0
      ? null
      : left === 0
        ? t.useToday
        : count(locale, t.useWithin, left);
  return {
    name: name("ingredients", item.ingredient),
    amount,
    line: [amount, useBy].filter(Boolean).join(" · "),
    warning: condition === "good" ? null : t[CONDITION_WORDS[condition]],
    howItIs: {
      label: t.howItIs,
      value: condition,
      options: CONDITIONS.map((c) => ({
        value: c,
        label: t[CONDITION_WORDS[c]],
      })),
      set: (value: string) => {
        const picked = CONDITIONS.find((c) => c === value);
        if (picked) void markFood(kitchen, id, picked);
      },
    },
    usedUp: { label: t.usedUp, run: () => void markUsedUp(kitchen, id) },
    change: {
      label: t.changeAmount,
      editing,
      start: () => {
        setEditing(true);
      },
      amountLabel: t.amount,
      unitLabel: t.unit,
      saveLabel: t.save,
      units: UNIT_CHOICES.map((u) => ({
        value: u,
        label: u === "pieces" ? t.piecesUnit : u,
      })),
      unit: item.unit ?? "g",
      save: (typed: string, unit: string) => {
        const n = Number(typed.replace(",", "."));
        const choice = UNIT_CHOICES.find((u) => u === unit);
        setEditing(false);
        if (!(n > 0) || !choice) return;
        const amount = toGramsOrMl(n, choice);
        void changeAmount(kitchen, id, amount.amount, amount.unit);
      },
    },
  };
}
