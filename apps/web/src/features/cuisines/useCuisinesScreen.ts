import { loadCuisine, setMakes } from "@cookto/usecases";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { namer, useKitchenSettings, useLoadedPacks } from "../../food.js";
import { kitchen, packs } from "../../platform.js";
import { goHome, open, openPack } from "../../routes.js";
import { cuisineName } from "./names.js";

/** "Choose what you cook": the cuisines, and what the household doesn't make. */
export function useCuisinesScreen() {
  const { locale, t } = useWords();
  const { cuisines: loaded, skip } = useKitchenSettings();
  const loadedPacks = useLoadedPacks();
  const name = namer(loadedPacks, locale);
  const parts = [
    ...new Set(
      loadedPacks.flatMap((p) => Object.keys(p.words.en?.parts ?? {})),
    ),
  ];
  return {
    title: t.chooseCuisines,
    back: t.back,
    onBack: goHome,
    cuisines: packs.cuisines().map((c) => {
      return {
        id: c.id,
        name: cuisineName(t, c.id),
        dishes: c.soon ? null : count(locale, t.dishCount, c.dishes),
        soon: c.soon ? t.comingSoon : null,
        loaded: loaded.includes(c.id) ? t.loaded : null,
        loadLabel: t.load,
        load: () => void loadCuisine(kitchen, c.id),
        // Its dishes, to pick from (specs/175).
        open: () => {
          openPack(c.id);
        },
      };
    }),
    skipTitle: t.whatWeDontMake,
    parts: parts.map((part) => ({
      part,
      label: name("parts", part),
      pressed: skip.includes(part),
      toggle: () => void setMakes(kitchen, part, skip.includes(part)),
    })),
    staples:
      loaded.length > 0
        ? {
            label: t.addStaples,
            onClick: () => {
              open("staples");
            },
          }
        : null,
  };
}
