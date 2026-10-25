import { MEAL_SLOTS, type MealSlot } from "@cookto/engine";
import { chooseLanguage } from "@cookto/usecases";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { namer, SLOT_WORDS, useAmountWords } from "../../food.js";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { packQuery, packs, queries, settings } from "../../platform.js";

// The cook's recipes (specs/241): the page her "Recipes" link opens inside
// Telegram, "#/cook/2026-10-22?d=breakfast.poha.3,lunch.dal-tadka.2&l=en".
// The dishes and how many eat each are in its address, and nothing else,
// so it needs no kitchen and no sign-in. The recipes are linked, not copied.

const subscribe = (onChange: () => void) => {
  addEventListener("hashchange", onChange);
  return () => {
    removeEventListener("hashchange", onChange);
  };
};

interface Wanted {
  slot: MealSlot;
  dish: string;
  people: number;
}

/** The meals the address asks for, in the day's order, and its language. */
function read(hash: string): { meals: Wanted[]; language: string | null } {
  const query = new URLSearchParams(hash.split("?")[1] ?? "");
  const meals = (query.get("d") ?? "").split(",").flatMap((part) => {
    const [slot, dish, n] = part.split(".");
    const meal = MEAL_SLOTS.find((s) => s === slot);
    const people = Number(n);
    return meal && dish && people > 0 ? [{ slot: meal, dish, people }] : [];
  });
  meals.sort((a, b) => MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot));
  return { meals, language: query.get("l") };
}

export function useCookPage() {
  const { locale, t } = useWords();
  const hash = useSyncExternalStore(
    subscribe,
    () => location.hash,
    () => "",
  );
  const { meals, language } = read(hash);
  // In the cook's language, when the app speaks it.
  useEffect(() => {
    if (language) chooseLanguage({ settings: settings.writer }, language);
  }, [language]);
  const loaded = useQueries(
    {
      queries: packs
        .cuisines()
        .filter((c) => !c.soon)
        .map((c) => packQuery(c.id)),
    },
    queries,
  ).flatMap((q) => (q.data ? [q.data] : []));
  const name = namer(loaded, locale);
  const amountOf = useAmountWords();
  return {
    title: t.tomorrow,
    meals: meals.flatMap(({ slot, dish, people }) => {
      const found = loaded.flatMap((p) => p.dishes).find((d) => d.id === dish);
      if (!found) return [];
      return [
        {
          key: `${slot}.${dish}`,
          label: t[SLOT_WORDS[slot]],
          dish: name("dishes", dish),
          photo: found.photo?.large,
          forPeople: count(locale, t.forPeople, people),
          ingredients: found.ingredients.map((id, i) => {
            const per = found.amounts?.[i];
            return {
              key: id,
              label: name("ingredients", id),
              value: per
                ? (amountOf({ amount: per[0] * people, unit: per[1] }) ?? "")
                : "",
            };
          }),
          recipe: found.source ? { href: found.source, label: t.recipe } : null,
        },
      ];
    }),
  };
}
