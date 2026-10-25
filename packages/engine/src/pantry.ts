// The pantry (ADR 0027): what's in the kitchen, how much, and how it is.
// Fresh food has a use-by date from its shelf life; staples don't. The
// person's mark wins over the date.
import { addDays, daysLeft } from "./expiry.js";

export const UNITS = ["g", "ml", "pieces"] as const;
export type Unit = (typeof UNITS)[number];

/** Worst last, so a higher number needs using sooner. */
export const CONDITIONS = ["good", "use-soon", "past-its-best"] as const;
export type Condition = (typeof CONDITIONS)[number];

export interface PantryItem {
  id: string;
  /** A pack's Wikidata id, or the words typed when no loaded pack knows it. */
  ingredient: string;
  /** Unknown ("have it") until a bill or the person says. */
  amount?: number;
  unit?: Unit;
  boughtOn: string;
  /** Fresh food only. */
  shelfLifeDays?: number;
  /** Bought frozen: its shelf life is its days frozen (specs/149). */
  frozen?: boolean;
  mark?: Condition;
}

/** The last good day, or none for a staple. */
export function useBy(item: PantryItem): string | undefined {
  if (item.shelfLifeDays === undefined) return undefined;
  return addDays(item.boughtOn, item.shelfLifeDays);
}

/**
 * The fresh food a dish uses that goes off on `day` or the day after, the
 * soonest first (specs/270): the reason a planned dish gives. None when its
 * food keeps longer, is a staple, or has already gone off.
 */
export function goesOffWith(
  ingredients: readonly string[],
  pantry: readonly PantryItem[],
  day: string,
): { ingredient: string; useBy: string } | null {
  const last = addDays(day, 1);
  let soonest: { ingredient: string; useBy: string } | null = null;
  for (const item of pantry) {
    const by = useBy(item);
    if (by === undefined || by < day || by > last) continue;
    if (!ingredients.includes(item.ingredient)) continue;
    if (!soonest || by < soonest.useBy)
      soonest = { ingredient: item.ingredient, useBy: by };
  }
  return soonest;
}

/** Use soon from the day before the use-by date; past its best after it. */
export function conditionOf(item: PantryItem, today: string): Condition {
  if (item.mark) return item.mark;
  if (item.shelfLifeDays === undefined) return "good";
  const left = daysLeft(item.boughtOn, item.shelfLifeDays, today);
  if (left < 0) return "past-its-best";
  return left <= 1 ? "use-soon" : "good";
}

/** How soon an item needs using: lower comes first. */
export function urgency(item: PantryItem, today: string): [number, number] {
  const condition = CONDITIONS.indexOf(conditionOf(item, today));
  const left =
    item.shelfLifeDays === undefined
      ? Infinity
      : daysLeft(item.boughtOn, item.shelfLifeDays, today);
  return [-condition, left];
}

export function compareUrgency(
  a: [number, number],
  b: [number, number],
): number {
  return a[0] - b[0] || (a[1] === b[1] ? 0 : a[1] < b[1] ? -1 : 1);
}

/** Food that needs using first, then the nearest use-by; ties keep order. */
export function pantryOrder(
  items: readonly PantryItem[],
  today: string,
): PantryItem[] {
  return items
    .map((item) => ({ item, key: urgency(item, today) }))
    .sort((a, b) => compareUrgency(a.key, b.key))
    .map(({ item }) => item);
}

const LARGE = { g: "kg", ml: "l" } as const;
export type ShownUnit = Unit | "kg" | "l";

/** An amount as people read it: 1500 g is 1.5 kg. None when unknown. */
export function shownAmount(
  amount: number | undefined,
  unit: Unit | undefined,
): { value: number; unit: ShownUnit } | undefined {
  if (amount === undefined || unit === undefined) return undefined;
  if (unit !== "pieces" && amount >= 1000)
    return { value: amount / 1000, unit: LARGE[unit] };
  return { value: amount, unit };
}
