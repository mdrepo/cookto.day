import type { AppPack, PlannedMeal } from "@cookto/data";
import {
  addDays,
  assumedStaples,
  type Beans,
  childrenOnly,
  type Cooked,
  cookedLately,
  cookTodayForMeals,
  defaultMeals,
  type Dish,
  type MealSlot,
  type Member,
  type PantryItem,
  plannedLately,
  plannedSlots,
  waitingForPrep,
} from "@cookto/engine";
import { KEEP_DIFFERENT_DAYS } from "./cooked.js";

// Each meal's ranked ideas for today and, from 4 pm, tomorrow (specs/72,
// 94, 104, 144), so Tomorrow on the phone and "Change" in the chat
// (specs/270) offer the same. A meal planned the evening before is its
// pick; a dish whose prep starts the day before waits until it's planned,
// so its prep is done.

/** From this time, Today also plans tomorrow, so its prep can start (#144). */
const EVENING = "16:00";

export interface IdeasInput {
  /** Every loaded pack, for its staples. */
  packs: readonly AppPack[];
  /** My dishes (specs/175): the only ones planned. */
  dishes: readonly Dish[];
  skip: readonly string[];
  beans: Beans;
  pantry: readonly PantryItem[];
  members: readonly Member[];
  history: readonly Cooked[];
  plans: readonly PlannedMeal[];
  /** The household's time, "YYYY-MM-DDTHH:MM". */
  now: string;
}

/** Every staple the loaded packs know, as a set of ids. */
export function packStaples(packs: readonly AppPack[]): Set<string> {
  return new Set(packs.flatMap((p) => Object.values(p.staples).flat()));
}

export function mealIdeas(i: IdeasInput) {
  const { dishes, members, plans, history } = i;
  // Nobody saved yet (a sample, or onboarding skipped): one adult's meals.
  const eaten = plannedSlots(members);
  const slots = eaten.length > 0 ? eaten : defaultMeals("adult");
  // A meal only children eat picks from the child's list (specs/145).
  const childSlots = new Set(slots.filter((s) => childrenOnly(s, members)));
  const day = i.now.slice(0, 10);
  const next = addDays(day, 1);
  const plannedOn = (on: string): Partial<Record<MealSlot, string>> =>
    Object.fromEntries(
      plans
        .filter((p) => p.on === on && p.prep !== "skipped" && !p.for)
        .map((p) => [p.slot, p.dish]),
    );
  const base = {
    slots,
    dishes,
    pantry: i.pantry,
    staples: assumedStaples(packStaples(i.packs), i.pantry),
    skip: new Set(i.skip),
    childSlots,
  };
  const todayPlans = plannedOn(day);
  const today = cookTodayForMeals({
    ...base,
    today: day,
    planned: todayPlans,
    avoid: new Set([
      ...cookedLately(history, day, KEEP_DIFFERENT_DAYS),
      // A planned meal counts as made (specs/195).
      ...plannedLately(plans, day, KEEP_DIFFERENT_DAYS),
      ...waitingForPrep(dishes, i.beans, new Set(Object.values(todayPlans))),
    ]),
  });
  // Tomorrow differs from today, and there's tonight for its prep.
  const tomorrow =
    i.now.slice(11) >= EVENING
      ? cookTodayForMeals({
          ...base,
          today: next,
          planned: plannedOn(next),
          avoid: new Set([
            ...cookedLately(history, next, KEEP_DIFFERENT_DAYS),
            ...plannedLately(plans, next, KEEP_DIFFERENT_DAYS),
            ...today
              .flatMap((m) => m.suggestions.slice(0, 1))
              .map((s) => s.dish.id),
          ]),
        })
      : null;
  return { day, next, childSlots, today, tomorrow };
}
