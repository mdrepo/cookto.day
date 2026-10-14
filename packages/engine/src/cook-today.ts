// What to cook today (ADR 0027). For one meal slot, rank the loaded packs'
// dishes: ones the pantry can make first, using food that needs using
// first; the rest after, the same way, then fewest missing first. No
// cuisine logic here: only ingredients, dates, conditions, slots and what
// the household skips.
import type { MealSlot } from "./household.js";
import { compareUrgency, type PantryItem, urgency } from "./pantry.js";

export interface Dish {
  id: string;
  slots: readonly MealSlot[];
  /** Ingredient ids, as the pantry keys them. */
  ingredients: readonly string[];
  /** Parts served with it, any one of them ("roti", "rice"). */
  servedWith?: readonly string[];
}

export interface Suggestion {
  dish: Dish;
  /** Fresh food from the pantry it uses, the most urgent first. */
  uses: string[];
  /** Ingredients the pantry doesn't have; staples are assumed. */
  needs: string[];
  servedWith: string[];
}

export interface CookTodayInput {
  slot: MealSlot;
  dishes: readonly Dish[];
  pantry: readonly PantryItem[];
  /** Ingredient ids that are staples: assumed to be in the kitchen. */
  staples: ReadonlySet<string>;
  today: string;
  /** Parts and ingredients the household doesn't make or avoids. */
  skip?: ReadonlySet<string>;
}

export function cookToday(input: CookTodayInput): Suggestion[] {
  const { slot, pantry, staples, today } = input;
  const skip = input.skip ?? new Set<string>();
  const fresh = new Map<string, PantryItem>();
  const have = new Set<string>();
  for (const item of pantry) {
    have.add(item.ingredient);
    if (item.shelfLifeDays !== undefined && !staples.has(item.ingredient))
      fresh.set(item.ingredient, item);
  }
  const key = (id: string) => urgency(fresh.get(id) as PantryItem, today);

  const ranked = input.dishes
    .filter(
      (d) =>
        d.slots.includes(slot) &&
        !skip.has(d.id) &&
        !d.ingredients.some((i) => skip.has(i)),
    )
    .map((dish, order) => {
      const uses = dish.ingredients
        .filter((i) => fresh.has(i))
        .map((id) => ({ id, key: key(id) }))
        .sort((a, b) => compareUrgency(a.key, b.key));
      return {
        order,
        top: uses[0]?.key ?? ([0, Infinity] as [number, number]),
        suggestion: {
          dish,
          uses: uses.map((u) => u.id),
          needs: dish.ingredients.filter(
            (i) => !have.has(i) && !staples.has(i),
          ),
          servedWith: (dish.servedWith ?? []).filter((p) => !skip.has(p)),
        },
      };
    });

  return ranked
    .sort(
      (a, b) =>
        Number(a.suggestion.needs.length > 0) -
          Number(b.suggestion.needs.length > 0) ||
        compareUrgency(a.top, b.top) ||
        b.suggestion.uses.length - a.suggestion.uses.length ||
        a.suggestion.needs.length - b.suggestion.needs.length ||
        a.order - b.order,
    )
    .map((r) => r.suggestion);
}

export interface MealSuggestions {
  slot: MealSlot;
  suggestions: Suggestion[];
}

/**
 * What to cook today for each meal, in the day's order (specs/94). A dish
 * picked for an earlier meal moves to the end of a later meal's list, so
 * lunch and dinner differ when the kitchen offers more than one dish.
 */
export function cookTodayForMeals(
  input: Omit<CookTodayInput, "slot"> & { slots: readonly MealSlot[] },
): MealSuggestions[] {
  const picked = new Set<string>();
  return input.slots.map((slot) => {
    const ranked = cookToday({ ...input, slot });
    const suggestions = [
      ...ranked.filter((s) => !picked.has(s.dish.id)),
      ...ranked.filter((s) => picked.has(s.dish.id)),
    ];
    const best = suggestions[0];
    if (best) picked.add(best.dish.id);
    return { slot, suggestions };
  });
}
