import type { MealSlot } from "@cookto/engine";
import { addChildDish, childAddIn, removeChildDish } from "@cookto/usecases";
import { namer } from "../../food.js";
import { fill } from "../../i18n/format.js";
import { useWords } from "../../i18n/useWords.js";
import { plans } from "../../platform.js";
import { openDish } from "../../routes.js";
import { useMealPlans } from "./useMealPlans.js";

/**
 * Each meal's dish for the child (specs/145): a way to add one when a child
 * eats a meal the adults eat too, or the one added, with its add-ins and
 * "Remove". A meal only children eat is already theirs.
 */
export function useChildDishes() {
  const { locale, t } = useWords();
  const m = useMealPlans();
  if (!m) return null;
  const name = namer(m.packs, locale);
  const food = (id: string) =>
    name("ingredients", id).toLocaleLowerCase(locale);
  const k = { plans };
  const packOf = new Map(
    m.packs.flatMap((p) => p.dishes.map((d) => [d.id, p.id] as const)),
  );
  const childEats = (slot: MealSlot) =>
    m.members.some((x) => x.kind !== "adult" && x.meals.includes(slot));
  const options = (slot: MealSlot) =>
    m.dishes
      .filter((d) => d.for?.includes("child") && d.slots.includes(slot))
      .map((d) => ({
        key: d.id,
        name: name("dishes", d.id),
        onOpen: () => {
          void addChildDish(k, m.day, slot, d.id);
        },
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  const forSlot = (slot: MealSlot) => {
    if (m.childSlots.has(slot) || !childEats(slot)) return null;
    const plan = m.plans.find(
      (p) => p.on === m.day && p.slot === slot && p.for === "child",
    );
    const dish = plan && m.dishes.find((d) => d.id === plan.dish);
    if (!plan || !dish)
      return { add: { label: t.addDishForChild, options: options(slot) } };
    const called = name("dishes", dish.id);
    const shown = plan.addIn
      ? fill(t.dishWithFood, { dish: called, food: food(plan.addIn) })
      : called;
    return {
      planned: {
        label: t.forTheChild,
        text: fill(t.forTheChildDish, { dish: shown }),
        open: {
          label: shown,
          run: () => {
            openDish(packOf.get(dish.id) ?? "", dish.id, { slot, child: true });
          },
        },
        actions: [
          ...(plan.addIn
            ? []
            : (dish.addIns ?? []).map(([id]) => ({
                label: fill(t.addInFood, { food: food(id) }),
                run: () => {
                  void childAddIn(k, m.day, slot, id);
                },
              }))),
          {
            label: t.remove,
            run: () => {
              void removeChildDish(k, m.day, slot);
            },
          },
        ],
      },
    };
  };
  return { forSlot, pickerTitle: t.addDishForChild, close: t.close };
}
