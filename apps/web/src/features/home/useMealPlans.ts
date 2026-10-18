import type { AppPack } from "@cookto/data";
import {
  addDays,
  childrenOnly,
  cookedLately,
  cookTodayForMeals,
  defaultMeals,
  type MealSlot,
  plannedSlots,
  waitingForPrep,
} from "@cookto/engine";
import { KEEP_DIFFERENT_DAYS } from "@cookto/usecases";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  staplesToAssume,
  useKitchenSettings,
  useLoadedPacks,
} from "../../food.js";
import {
  clock,
  cookedQuery,
  membersQuery,
  pantryQuery,
  plansQuery,
  queries,
  settings,
} from "../../platform.js";

/** From this time, Today also plans tomorrow, so its prep can start (#144). */
const EVENING = "16:00";

const dishesOf = (packs: readonly AppPack[]) => packs.flatMap((p) => p.dishes);

/**
 * Each meal's ranked ideas for today and, from 4 pm, tomorrow (specs/72, 94,
 * 104, 144). A meal planned the evening before is its pick; a dish whose
 * prep starts the day before waits until it's planned, so its prep is done.
 */
export function useMealPlans() {
  const packs = useLoadedPacks();
  const { skip } = useKitchenSettings();
  const beans = useStore(settings.store, (s) => s.beans);
  const { data: items = [] } = useQuery(pantryQuery, queries);
  const { data: members = [] } = useQuery(membersQuery, queries);
  const { data: history = [] } = useQuery(cookedQuery, queries);
  const { data: plans = [] } = useQuery(plansQuery, queries);
  const dishes = dishesOf(packs);
  if (dishes.length === 0) return null;
  // Nobody saved yet (a sample, or onboarding skipped): one adult's meals.
  const eaten = plannedSlots(members);
  const slots = eaten.length > 0 ? eaten : defaultMeals("adult");
  // A meal only children eat picks from the child's list (specs/145).
  const childSlots = new Set(slots.filter((s) => childrenOnly(s, members)));
  const now = clock();
  const day = now.slice(0, 10);
  const next = addDays(day, 1);
  const plannedOn = (on: string): Partial<Record<MealSlot, string>> =>
    Object.fromEntries(
      plans
        .filter((p) => p.on === on && p.prep !== "skipped")
        .map((p) => [p.slot, p.dish]),
    );
  const base = {
    slots,
    dishes,
    pantry: items,
    staples: staplesToAssume(packs, items),
    skip: new Set(skip),
    childSlots,
  };
  const todayPlans = plannedOn(day);
  const today = cookTodayForMeals({
    ...base,
    today: day,
    planned: todayPlans,
    avoid: new Set([
      ...cookedLately(history, day, KEEP_DIFFERENT_DAYS),
      ...waitingForPrep(dishes, beans, new Set(Object.values(todayPlans))),
    ]),
  });
  // Tomorrow differs from today, and there's tonight for its prep.
  const tomorrow =
    now.slice(11) >= EVENING
      ? cookTodayForMeals({
          ...base,
          today: next,
          planned: plannedOn(next),
          avoid: new Set([
            ...cookedLately(history, next, KEEP_DIFFERENT_DAYS),
            ...today
              .flatMap((m) => m.suggestions.slice(0, 1))
              .map((s) => s.dish.id),
          ]),
        })
      : null;
  return {
    packs,
    day,
    next,
    now,
    beans,
    plans,
    dishes,
    members,
    childSlots,
    today,
    tomorrow,
  };
}
