import type { AppPack, KitchenItem } from "@cookto/data";
import type { KitchenSettings } from "@cookto/data/read";
import {
  assumedStaples,
  conditionOf,
  daysLeft,
  type MealSlot,
  missing,
  type PantryItem,
  shownAmount,
} from "@cookto/engine";
import { useQueries } from "@tanstack/react-query";
import { useStore } from "zustand";
import { count } from "./i18n/format.js";
import type { Messages } from "./i18n/en.js";
import { useWords } from "./i18n/useWords.js";
import { packQuery, queries, settings } from "./platform.js";

// What the kitchen's screens share (ADR 0022: below the features): the
// kitchen's settings, the loaded packs, and food's words. Food is named by
// the loaded packs in the page's language, then English, then as typed.

export const SLOT_WORDS = {
  breakfast: "breakfast",
  "morning-snack": "morningSnack",
  lunch: "lunch",
  "evening-snack": "eveningSnack",
  dinner: "dinner",
} as const satisfies Record<MealSlot, keyof Messages>;

export function useKitchenSettings(): KitchenSettings {
  return useStore(settings.store, (s) => s.kitchen);
}

/** The packs of the cuisines loaded, once each has been read. */
export function useLoadedPacks(): AppPack[] {
  const { cuisines } = useKitchenSettings();
  return useQueries(
    {
      queries: cuisines.map((id) => packQuery(id)),
      combine: (results) => results.flatMap((r) => (r.data ? [r.data] : [])),
    },
    queries,
  );
}

type Kind = "ingredients" | "dishes" | "parts";

/** A name for food, a dish or a part, from the loaded packs. */
export function namer(packs: readonly AppPack[], locale: string) {
  return (kind: Kind, id: string): string => {
    for (const lang of [locale, "en"])
      for (const pack of packs) {
        const word = pack.words[lang]?.[kind][id];
        if (word) return word;
      }
    return id;
  };
}

/** Every staple the loaded packs know, as a set of ids. */
export function packStaples(packs: readonly AppPack[]): Set<string> {
  return new Set(packs.flatMap((p) => Object.values(p.staples).flat()));
}

/** The staples to assume are in the kitchen (the engine's rule, ADR 0027). */
export function staplesToAssume(
  packs: readonly AppPack[],
  items: readonly KitchenItem[],
): Set<string> {
  return assumedStaples(packStaples(packs), items);
}

/** "250 g", "1.5 kg", "2 pieces"; nothing when the amount isn't known. */
export function useAmountWords() {
  const { locale, t } = useWords();
  return (item: Pick<KitchenItem, "amount" | "unit">): string | null => {
    const shown = shownAmount(item.amount, item.unit);
    if (!shown) return null;
    if (shown.unit === "pieces") return count(locale, t.pieces, shown.value);
    const n = shown.value.toLocaleString(locale, { maximumFractionDigits: 2 });
    return `${n} ${shown.unit}`;
  };
}

/** "Spinach and Paneer", or with `or`: "Roti or Rice". */
export function listOf(
  locale: string,
  items: readonly string[],
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  return new Intl.ListFormat(locale, { type }).format(items);
}

const CONDITION_WORDS = {
  good: "good",
  "use-soon": "useSoon",
  "past-its-best": "pastItsBest",
} as const;

/**
 * An item in words: its name, "250 g · use within 3 days", and the warning
 * when it needs using (DESIGN.md, the pantry list).
 */
export function useItemWords() {
  const { locale, t } = useWords();
  const name = namer(useLoadedPacks(), locale);
  const amountOf = useAmountWords();
  return (item: PantryItem, day: string) => {
    const condition = conditionOf(item, day);
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
    const amount = amountOf(item);
    return {
      name: name("ingredients", item.ingredient),
      amount,
      line: [amount, useBy].filter(Boolean).join(" · "),
      condition,
      warning: condition === "good" ? null : t[CONDITION_WORDS[condition]],
    };
  };
}

/**
 * Each loaded dish and how many things it needs that the kitchen doesn't
 * have; staples are assumed until the household adds its own (specs/72, 97).
 */
export function dishNeeds(
  packs: readonly AppPack[],
  items: readonly KitchenItem[],
): { pack: string; dish: AppPack["dishes"][number]; needs: number }[] {
  const have = new Set(items.map((i) => i.ingredient));
  const staples = staplesToAssume(packs, items);
  return packs.flatMap((pack) =>
    pack.dishes.map((dish) => ({
      pack: pack.id,
      dish,
      needs: missing(dish.ingredients, have, staples).length,
    })),
  );
}
