import { eatersOf, MEAL_SLOTS } from "@cookto/engine";
import { useQuery } from "@tanstack/react-query";
import { useWords } from "../../i18n/useWords.js";
import { membersQuery, queries } from "../../platform.js";
import { SLOT_WORDS } from "../../food.js";
import { numberOf, titleOf } from "./names.js";

/** All set: each meal, with who it's for (criterion 4). */
export function useDoneStep() {
  const { t } = useWords();
  const { data: members = [] } = useQuery(membersQuery, queries);
  return {
    label: t.meals,
    note: t.changeAnyTime,
    rows: MEAL_SLOTS.map((slot) => {
      const eaters = eatersOf(slot, members);
      const value =
        eaters.length === 0
          ? t.notPlanned
          : eaters.length === members.length && members.length > 1
            ? t.everyone
            : eaters.map((p) => titleOf(p, numberOf(p, members), t)).join(", ");
      return {
        key: slot,
        label: t[SLOT_WORDS[slot]],
        value,
        quiet: eaters.length === 0,
      };
    }),
  };
}
