import type { PlansWriter } from "@cookto/data/write";
import type { MealSlot } from "@cookto/engine";

// The child's own dish (specs/145): beside a meal's, with one optional
// add-in, and gone again when the child shares the meal.

interface Plans {
  plans: { writer: PlansWriter };
}

/** "Add a dish for the child": the child's dish at that meal. */
export async function addChildDish(
  k: Plans,
  on: string,
  slot: MealSlot,
  dish: string,
): Promise<void> {
  await k.plans.writer.plan(on, slot, dish, "child");
}

/** "Add egg": the child's dish's one extra. */
export async function childAddIn(
  k: Plans,
  on: string,
  slot: MealSlot,
  addIn: string,
): Promise<void> {
  await k.plans.writer.addIn(on, slot, addIn);
}

/** "Remove": the child shares the meal again. */
export async function removeChildDish(
  k: Plans,
  on: string,
  slot: MealSlot,
): Promise<void> {
  await k.plans.writer.remove(on, slot, "child");
}
