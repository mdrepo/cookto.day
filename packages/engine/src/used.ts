import type { PantryItem, Unit } from "./pantry.js";

// What a meal takes from the pantry (specs/242): for each food the pantry
// holds with an amount in the recipe's unit, the recipe's amount for one
// person times the people who ate it, and a child's extra its own amount.
// Food the pantry has with no amount ("have it"), in another unit, or
// doesn't have is left alone. Several dishes that use one food add up.

export interface MealDish {
  ingredients: readonly string[];
  /** For one person, in the order of `ingredients`. */
  amounts?: readonly (readonly [number, Unit])[];
  /** The people who ate it. */
  people: number;
  /** The child's dish's extra, for one child: food, amount, unit. */
  addIn?: readonly [string, number, Unit];
}

export interface Used {
  ingredient: string;
  amount: number;
  unit: Unit;
}

export function usedBy(
  meal: readonly MealDish[],
  pantry: readonly Pick<PantryItem, "ingredient" | "amount" | "unit">[],
): Used[] {
  const held = new Map<string, Unit>();
  for (const p of pantry)
    if (p.amount !== undefined && p.unit !== undefined)
      held.set(p.ingredient, p.unit);
  const used = new Map<string, Used>();
  const take = (ingredient: string, amount: number, unit: Unit) => {
    if (held.get(ingredient) !== unit || amount <= 0) return;
    const had = used.get(ingredient);
    used.set(ingredient, {
      ingredient,
      amount: (had?.amount ?? 0) + amount,
      unit,
    });
  };
  for (const dish of meal) {
    dish.ingredients.forEach((ingredient, i) => {
      const per = dish.amounts?.[i];
      if (per) take(ingredient, per[0] * dish.people, per[1]);
    });
    if (dish.addIn)
      take(dish.addIn[0], dish.addIn[1] * dish.people, dish.addIn[2]);
  }
  return [...used.values()];
}
