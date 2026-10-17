import type { DishPhoto } from "@cookto/data";
import { MEAL_SLOTS } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { count, fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import {
  assumedStaples,
  listOf,
  namer,
  SLOT_WORDS,
  useAmountWords,
  useKitchenSettings,
  useLoadedPacks,
} from "../../food.js";
import { membersQuery, pantryQuery, queries } from "../../platform.js";
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
 * A dish's page (specs/95): what it needs, for everyone at home, split into
 * what the kitchen has and what it doesn't, what to serve it with, and where
 * its recipe is. Nothing until its cuisine has loaded.
 */
export function useDishScreen() {
  const { locale, t } = useWords();
  const at = useDish();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const amountOf = useAmountWords();
  const { skip } = useKitchenSettings();
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const { data: members = [] } = useQuery(membersQuery, queries);
  const dish = packs
    .find((p) => p.id === at?.pack)
    ?.dishes.find((d) => d.id === at?.dish);
  const have = new Set(items.map((i) => i.ingredient));
  const staples = assumedStaples(packs, items);
  const actions = useDishActions(
    dish?.id,
    (dish?.ingredients ?? []).filter((i) => !have.has(i) && !staples.has(i)),
  );
  if (!dish) return null;

  // Nobody saved yet (a sample, or setup skipped): one person.
  const people = Math.max(members.length, 1);
  const rows = dish.ingredients.map((id, i) => {
    const per = dish.amounts?.[i];
    return {
      key: id,
      label: name("ingredients", id),
      value: per
        ? (amountOf({ amount: per[0] * people, unit: per[1] }) ?? "")
        : "",
      has: have.has(id) || staples.has(id),
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
    seeRecipe: t.seeRecipe,
    ...actions,
    source: dish.source,
    photo: photoOf(dish.photo, t.photoBy),
  };
}
