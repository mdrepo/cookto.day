import { type MealSlot, plannedSlots } from "@cookto/engine";
import { setMealTime } from "@cookto/usecases/schedule";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useStore } from "zustand";
import { SLOT_WORDS } from "../../food.js";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { membersQuery, queries, settings, shared } from "../../platform.js";

// Meal times (specs/240), in Household: only the meals the household eats,
// each a time in steps of 15 minutes. One before the meal it follows is
// refused, with why, and isn't saved.

const two = (n: number) => String(n).padStart(2, "0");
/** "00:00" to "23:45". */
const QUARTERS = Array.from(
  { length: 96 },
  (_, i) => `${two(Math.floor(i / 4))}:${two((i % 4) * 15)}`,
);

export function useMealTimes() {
  const { t, locale } = useWords();
  const times = useStore(settings.store, (s) => s.mealTimes);
  const { data: members = [] } = useQuery(membersQuery, queries);
  const eaten = plannedSlots(members);
  const [problem, setProblem] = useState<{
    slot: MealSlot;
    text: string;
  } | null>(null);
  const name = (slot: MealSlot) => t[SLOT_WORDS[slot]];
  return {
    title: t.mealTimes,
    meals: eaten.map((slot) => ({
      slot,
      label: name(slot),
      value: times[slot],
      // A time already saved off the quarter hour still shows.
      options: QUARTERS.includes(times[slot])
        ? QUARTERS
        : [...QUARTERS, times[slot]].sort(),
      problem: problem?.slot === slot ? problem.text : undefined,
      choose: (time: string) => {
        void shared().then(async (writer) => {
          const refused = await setMealTime(
            { settings: writer },
            slot,
            time,
            eaten,
          );
          setProblem(
            refused && {
              slot,
              text: fill(t.mealMustBeAfter, {
                meal: name(refused.meal),
                before: name(refused.before).toLocaleLowerCase(locale),
              }),
            },
          );
        });
      },
    })),
  };
}
