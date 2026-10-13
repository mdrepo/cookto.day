import { addFood } from "@cookto/usecases";
import { count } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { kitchen, today } from "../../platform.js";
import { toGramsOrMl, UNIT_CHOICES } from "./units.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day `daysAgo` days before today, "YYYY-MM-DD". */
function before(daysAgo: number): string {
  const day = new Date(`${today()}T00:00:00Z`).getTime() - daysAgo * DAY_MS;
  return new Date(day).toISOString().slice(0, 10);
}

/** Adding food by hand: its name, how much, and when it was bought. */
export function useAddFood(onDone: () => void) {
  const { locale, t } = useWords();
  return {
    title: t.addFood,
    nameLabel: t.name,
    amountLabel: t.amount,
    unitLabel: t.unit,
    boughtLabel: t.bought,
    addLabel: t.add,
    units: UNIT_CHOICES.map((u) => ({
      value: u,
      label: u === "pieces" ? t.piecesUnit : u,
    })),
    days: [0, 1, 2, 3, 4, 5, 6].map((n) => ({
      value: String(n),
      label:
        n === 0 ? t.today : n === 1 ? t.yesterday : count(locale, t.daysAgo, n),
    })),
    add: async (typed: {
      name: string;
      amount: string;
      unit: string;
      daysAgo: string;
    }) => {
      const name = typed.name.trim();
      if (!name) return;
      const n = Number(typed.amount.replace(",", "."));
      const unit = UNIT_CHOICES.find((u) => u === typed.unit);
      const amount = n > 0 && unit ? toGramsOrMl(n, unit) : null;
      await addFood(
        kitchen,
        {
          name,
          boughtOn: before(Number(typed.daysAgo) || 0),
          ...(amount ? { amount: amount.amount, unit: amount.unit } : {}),
        },
        locale,
      );
      onDone();
    },
  };
}
