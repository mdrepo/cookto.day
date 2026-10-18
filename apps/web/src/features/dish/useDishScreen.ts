import type { DishPhoto } from "@cookto/data";
import {
  MEAL_SLOTS,
  missing,
  type Prep,
  prepFor,
  servings,
} from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  staplesToAssume,
  listOf,
  namer,
  SLOT_WORDS,
  useAmountWords,
  useKitchenSettings,
  useLoadedPacks,
} from "../../food.js";
import {
  membersQuery,
  pantryQuery,
  plansQuery,
  queries,
  settings,
  stepsQuery,
  today,
} from "../../platform.js";
import { prepWords } from "../../prep.js";
import { goBack, useDish } from "../../routes.js";
import { useDishActions } from "./useDishActions.js";

/** Its photo, credited, linking to its page on Commons (specs/118). */
function photoOf(photo: DishPhoto | undefined, words: string) {
  if (!photo) return null;
  const { author, licence } = photo;
  return {
    src: photo.large,
    credit: fill(words, { author, licence }),
    source: photo.source,
  };
}

/**
 * How to cook it: its prep, for the household's beans, above the
 * ingredients (specs/144), and its steps under them (specs/149).
 */
function useRecipe(
  at: { pack: string; dish: string } | null,
  dish: { prep?: readonly Prep[] } | undefined,
  name: ReturnType<typeof namer>,
) {
  const { locale, t } = useWords();
  const beans = useStore(settings.store, (s) => s.beans);
  return {
    prepTitle: t.prep,
    prep: dish
      ? prepWords(name, t, locale).lines(prepFor(dish, beans), true)
      : [],
    stepsTitle: t.steps,
    steps: useSteps(at),
    seeFullVersion: t.seeFullVersion,
  };
}

type DishOf = NonNullable<
  ReturnType<typeof useLoadedPacks>[number]["dishes"]
>[number];

/**
 * How many the dish is for (specs/95, 145): everyone at home; opened from a
 * meal, who eats it then (the adults, when the child has a dish of their
 * own; the children, for the child's dish); and the child's add-in.
 */
function useServings(at: ReturnType<typeof useDish>, dish: DishOf | undefined) {
  const { data: members = [] } = useQuery(membersQuery, queries);
  const { data: plans = [] } = useQuery(plansQuery, queries);
  // Nobody saved yet (a sample, or setup skipped): one person.
  if (!at?.slot) return { people: Math.max(members.length, 1), addIn: null };
  const day = today();
  const child = plans.find(
    (p) => p.on === day && p.slot === at.slot && p.for === "child",
  );
  const own = at.child ? "child" : child !== undefined;
  const people = Math.max(servings(at.slot, members, own), 1);
  const addIn = at.child
    ? (dish?.addIns?.find(([id]) => id === child?.addIn) ?? null)
    : null;
  return { people, addIn };
}

/** The dish with its add-in among its ingredients, for one person. */
function withAddIn(
  dish: DishOf,
  addIn: [string, number, "g" | "ml" | "pieces"] | null,
): Pick<DishOf, "ingredients" | "amounts"> {
  if (!addIn) return dish;
  const [id, amount, unit] = addIn;
  return {
    ingredients: [...dish.ingredients, id],
    amounts: [...(dish.amounts ?? []), [amount, unit]],
  };
}

/** The dish's steps, once its pack's steps have loaded (specs/149). */
function useSteps(at: { pack: string; dish: string } | null): string[] {
  const { data } = useQuery(
    { ...stepsQuery(at?.pack ?? ""), enabled: at !== null },
    queries,
  );
  return (at && data?.[at.dish]) ?? [];
}

/**
 * A dish's page (specs/95): what it needs, for everyone at home, split into
 * what the kitchen has and what it doesn't, what to serve it with, and where
 * its recipe is, and its steps (specs/149). Nothing until its cuisine has loaded.
 */
export function useDishScreen() {
  const { locale, t } = useWords();
  const at = useDish();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const amountOf = useAmountWords();
  const { skip } = useKitchenSettings();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const dish = packs
    .find((p) => p.id === at?.pack)
    ?.dishes.find((d) => d.id === at?.dish);
  const have = new Set(items.map((i) => i.ingredient));
  const staples = staplesToAssume(packs, items);
  const { people, addIn } = useServings(at, dish);
  const used = dish ? withAddIn(dish, addIn) : null;
  const needs = missing(used?.ingredients ?? [], have, staples);
  const actions = useDishActions(dish?.id, needs);
  const recipe = useRecipe(at, dish, name);
  if (!dish) return null;

  const rows = (used ?? dish).ingredients.map((id, i) => {
    const per = (used ?? dish).amounts?.[i];
    return {
      key: id,
      label: name("ingredients", id),
      value: per
        ? (amountOf({ amount: per[0] * people, unit: per[1] }) ?? "")
        : "",
      has: !needs.includes(id),
    };
  });
  const need = rows.filter((r) => !r.has);
  const meals = MEAL_SLOTS.filter((s) => dish.slots.includes(s)).map(
    (s) => t[SLOT_WORDS[s]],
  );
  const served = (dish.servedWith ?? [])
    .filter((p) => !skip.includes(p))
    .map((p) => name("parts", p));
  return {
    title: name("dishes", dish.id),
    back: t.back,
    onBack: goBack,
    youNeed: t.youNeed,
    youHave: t.youHave,
    need,
    have: rows.filter((r) => r.has),
    reasons: [
      {
        key: "for",
        text: `${listOf(locale, meals)} · ${count(locale, t.forPeople, people)}`,
        tone: "quiet" as const,
      },
      need.length === 0
        ? { key: "has", text: t.hasEverything, tone: "good" as const }
        : {
            key: "needs",
            text: count(locale, t.needsCount, need.length),
            tone: "quiet" as const,
          },
      ...(served.length > 0
        ? [
            {
              key: "serve",
              text: fill(t.serveWith, {
                items: listOf(locale, served, "disjunction"),
              }),
              tone: "quiet" as const,
            },
          ]
        : []),
    ],
    ...recipe,
    ...actions,
    source: dish.source,
    photo: photoOf(dish.photo, t.photoBy),
  };
}
