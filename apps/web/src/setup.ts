import { useQuery } from "@tanstack/react-query";
import { useWords } from "./i18n/useWords.js";
import { packStaples, useKitchenSettings, useLoadedPacks } from "./food.js";
import { pantryQuery, queries } from "./platform.js";
import { open, openAddFood } from "./routes.js";

/**
 * Setting up a kitchen in three steps (#115): choose what you cook, add the
 * usual staples, add what you bought. A step is done once the kitchen has
 * it; the first one not done is next. `addFood` is how the last step adds
 * food: the Fridge opens its own "Add food"; elsewhere, the Fridge's.
 */
export function useKitchenSetup(addFood: () => void = openAddFood) {
  const { t } = useWords();
  const { cuisines } = useKitchenSettings();
  const staples = packStaples(useLoadedPacks());
  const { data: items } = useQuery(pantryQuery, queries);
  const list = items ?? [];
  const done = [
    cuisines.length > 0,
    list.some((i) => staples.has(i.ingredient)),
    list.some((i) => !staples.has(i.ingredient)),
  ];
  const next = done.indexOf(false);
  const steps = [
    {
      key: "cuisines",
      label: t.chooseCuisines,
      run: () => {
        open("cuisines");
      },
    },
    {
      key: "staples",
      label: t.addStaples,
      run: () => {
        open("staples");
      },
    },
    { key: "fresh", label: t.addWhatYouBought, run: addFood },
  ];
  return {
    /** The pantry has been read: until then, nothing is known. */
    known: items !== undefined,
    empty: list.length === 0,
    hasStaples: done[1] === true,
    hasFresh: done[2] === true,
    label: t.setUpKitchen,
    doneLabel: t.done,
    steps: steps.map((s, i) => ({
      key: s.key,
      label: s.label,
      state: done[i]
        ? ("done" as const)
        : i === next
          ? ("next" as const)
          : ("later" as const),
      onPress: s.run,
    })),
  };
}
