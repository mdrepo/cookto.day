import { clearSample, trySample } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWords } from "../../i18n/useWords.js";
import { useKitchenSettings } from "../../food.js";
import {
  kitchen,
  pantryQuery,
  queries,
  sampleAsked,
  today,
} from "../../platform.js";
import { open } from "../../routes.js";

/** The cuisine the sample kitchen loads. */
const SAMPLE = "north-indian";

/** Once per page: "?sample" fills a sample kitchen (specs/72, criterion 9). */
let askedAlready = false;

/** Home's way into the kitchen: cuisines, the pantry, dishes, the sample. */
export function useKitchenStart() {
  const { t } = useWords();
  const { cuisines, sample } = useKitchenSettings();
  const { data: stocked = false } = useQuery(
    { ...pantryQuery, select: (items) => items.length > 0 },
    queries,
  );
  useEffect(() => {
    if (askedAlready || !sampleAsked()) return;
    askedAlready = true;
    void trySample(kitchen, SAMPLE, today());
  }, []);
  const go = (page: Parameters<typeof open>[0]) => () => {
    open(page);
  };
  return {
    empty: cuisines.length === 0 && !stocked,
    choose: { label: t.chooseCuisines, onClick: go("cuisines") },
    pantry: { label: t.pantry, onClick: go("pantry") },
    dishes:
      cuisines.length > 0 ? { label: t.dishes, onClick: go("dishes") } : null,
    trySample:
      sample || stocked
        ? null
        : {
            label: t.trySample,
            onClick: () => void trySample(kitchen, SAMPLE, today()),
          },
    sample: sample
      ? {
          tag: t.sampleKitchen,
          body: t.sampleBody,
          clear: t.clearSample,
          onClear: () => void clearSample(kitchen),
        }
      : null,
  };
}
