// Prep the day before (specs/144): soaking, marinating, fermenting and
// thawing are data on a dish. The engine works out what's due as events;
// the app's screen shows them first, and any other channel (WhatsApp, email,
// a phone notification) can show the same events later.
import { addDays } from "./expiry.js";
import type { MealSlot } from "./household.js";

export const PREP_KINDS = ["soak", "marinate", "ferment", "thaw"] as const;
export type PrepKind = (typeof PREP_KINDS)[number];

export interface Prep {
  do: PrepKind;
  /** The ingredient it's done to, as the pantry keys it. */
  what: string;
  /** How long before cooking it has to start, at least. */
  hours: number;
  /** Beans that also come tinned: with tinned beans, there's no soak. */
  tinned?: boolean;
}

/** The household's beans (Settings): dried need soaking, tinned don't. */
export type Beans = "dried" | "tinned";

/** A meal planned the evening before, and its prep (specs/144). */
export interface Plan {
  /** The meal's day, "YYYY-MM-DD". */
  on: string;
  slot: MealSlot;
  dish: string;
  /** Marked done ("since" says when), or "No" in the morning. */
  prep: "done" | "skipped" | null;
  /** When the prep was marked done, "HH:MM" on the evening before. */
  since?: string;
}

export type PrepEvent =
  | {
      kind: "tonight" | "ask";
      dish: string;
      on: string;
      slot: MealSlot;
      prep: Prep[];
    }
  | {
      kind: "under-way";
      dish: string;
      on: string;
      slot: MealSlot;
      prep: Prep[];
      since: string;
    };

/** Prep that long has to start the evening before: soaking, fermenting. */
const OVERNIGHT_HOURS = 6;
/** From this hour, tomorrow is planned and its prep can start (specs/144). */
const EVENING = "16:00";

/** The prep a dish needs, for the household's beans. */
export function prepFor(
  dish: { prep?: readonly Prep[] },
  beans: Beans,
): Prep[] {
  return (dish.prep ?? []).filter((p) => !(beans === "tinned" && p.tinned));
}

/** Whether a dish's prep has to start the day before. */
function overnight(prep: readonly Prep[]): boolean {
  return prep.some((p) => p.hours >= OVERNIGHT_HOURS);
}

/**
 * Dishes that can't be cooked today: their prep starts the day before and
 * isn't done. They're no meal's pick, but stay ideas.
 */
export function waitingForPrep(
  dishes: readonly { id: string; prep?: readonly Prep[] }[],
  beans: Beans,
  prepped: ReadonlySet<string>,
): Set<string> {
  return new Set(
    dishes
      .filter((d) => overnight(prepFor(d, beans)) && !prepped.has(d.id))
      .map((d) => d.id),
  );
}

/**
 * What's due now, for the planned meals: from 4 pm, tomorrow's prep is due
 * tonight; prep marked done is under way until its meal's day is over; on
 * the meal's day, prep nobody marked is a question.
 */
export function prepEvents(input: {
  /** The household's time, "YYYY-MM-DDTHH:MM". */
  now: string;
  plans: readonly Plan[];
  dishes: readonly { id: string; prep?: readonly Prep[] }[];
  beans: Beans;
}): PrepEvent[] {
  const [today = "", time = ""] = input.now.split("T");
  const tomorrow = addDays(today, 1);
  return input.plans.flatMap((plan): PrepEvent[] => {
    const dish = input.dishes.find((d) => d.id === plan.dish);
    const prep = dish ? prepFor(dish, input.beans) : [];
    if (!overnight(prep)) return [];
    const { on, slot } = plan;
    const event = { dish: plan.dish, on, slot, prep };
    const coming = on === today || (on === tomorrow && time >= EVENING);
    if (!coming || plan.prep === "skipped") return [];
    if (plan.prep === "done")
      return [{ ...event, kind: "under-way", since: plan.since ?? "" }];
    return [{ ...event, kind: on === today ? "ask" : "tonight" }];
  });
}
