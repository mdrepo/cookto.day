import { STAPLE_GROUPS } from "@cookto/data";
import { addStaples } from "@cookto/usecases";
import { useState } from "react";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { namer, useLoadedPacks } from "../../food.js";
import { kitchen, today } from "../../platform.js";
import { goHome, open } from "../../routes.js";

const GROUP_WORDS = {
  "grains-and-dals": "grainsAndDals",
  spices: "spices",
  basics: "basics",
} as const;

/** The usual staples, all ticked; untick what the kitchen doesn't keep. */
export function useStaplesScreen() {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const groups = STAPLE_GROUPS.map((group) => ({
    group,
    title: t[GROUP_WORDS[group]],
    ids: [...new Set(packs.flatMap((p) => p.staples[group]))],
  })).filter((g) => g.ids.length > 0);
  const ticked = groups.flatMap((g) => g.ids).filter((id) => !unticked.has(id));
  return {
    title: t.addStaples,
    back: t.back,
    onBack: goHome,
    groups: groups.map((g) => ({
      ...g,
      staples: g.ids.map((id) => ({
        id,
        label: name("ingredients", id),
        pressed: !unticked.has(id),
        toggle: () => {
          setUnticked((now) => {
            const next = new Set(now);
            if (!next.delete(id)) next.add(id);
            return next;
          });
        },
      })),
    })),
    addLabel: count(locale, t.addStapleCount, ticked.length),
    canAdd: ticked.length > 0,
    add: async () => {
      await addStaples(kitchen, ticked, today());
      open("pantry");
    },
  };
}
