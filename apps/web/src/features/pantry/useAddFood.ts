import { addDays } from "@cookto/engine";
import { addBoughtFood, addFood } from "@cookto/usecases";
import { useState } from "react";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { namer, packStaples, useLoadedPacks } from "../../food.js";
import { kitchen, today } from "../../platform.js";
import { toGramsOrMl, UNIT_CHOICES } from "./units.js";

/** The day `daysAgo` days before today, "YYYY-MM-DD". */
const before = (daysAgo: number) => addDays(today(), -daysAgo);

/**
 * Adding food: tapping the loaded cuisines' fresh food (specs/113), or
 * typing a name, how much, and when it was bought (specs/72).
 */
export function useAddFood(onDone: () => void) {
  const { locale, t } = useWords();
  const packs = useLoadedPacks();
  const name = namer(packs, locale);
  const staples = packStaples(packs);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [typed, setTyped] = useState("");
  const fresh = [
    ...new Set(
      packs.flatMap((p) =>
        Object.values(p.words).flatMap((w) =>
          Object.keys(w?.ingredients ?? {}),
        ),
      ),
    ),
  ]
    .filter((id) => !staples.has(id))
    .map((id) => ({ id, label: name("ingredients", id) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const adding = picked.size + (typed.trim() ? 1 : 0);
  return {
    title: t.addFood,
    tapLabel: t.tapWhatYouBought,
    fresh: fresh.map((f) => ({
      ...f,
      pressed: picked.has(f.id),
      toggle: () => {
        setPicked((now) => {
          const next = new Set(now);
          if (!next.delete(f.id)) next.add(f.id);
          return next;
        });
      },
    })),
    nameLabel: t.name,
    /** Typing a name is needed only when nothing is tapped. */
    nameRequired: picked.size === 0,
    onType: setTyped,
    amountLabel: t.amount,
    unitLabel: t.unit,
    boughtLabel: t.bought,
    addLabel: picked.size > 0 ? count(locale, t.addCount, adding) : t.add,
    units: UNIT_CHOICES.map((u) => ({
      value: u,
      label: u === "pieces" ? t.piecesUnit : u,
    })),
    days: [0, 1, 2, 3, 4, 5, 6].map((n) => ({
      value: String(n),
      label:
        n === 0 ? t.today : n === 1 ? t.yesterday : count(locale, t.daysAgo, n),
    })),
    add: async (form: {
      name: string;
      amount: string;
      unit: string;
      daysAgo: string;
    }) => {
      const boughtOn = before(Number(form.daysAgo) || 0);
      const foodName = form.name.trim();
      if (picked.size === 0 && !foodName) return;
      if (picked.size > 0)
        await addBoughtFood(kitchen, [...picked], boughtOn, locale);
      if (foodName) {
        const n = Number(form.amount.replace(",", "."));
        const unit = UNIT_CHOICES.find((u) => u === form.unit);
        const amount = n > 0 && unit ? toGramsOrMl(n, unit) : null;
        await addFood(
          kitchen,
          {
            name: foodName,
            boughtOn,
            ...(amount ? { amount: amount.amount, unit: amount.unit } : {}),
          },
          locale,
        );
      }
      onDone();
    },
  };
}
