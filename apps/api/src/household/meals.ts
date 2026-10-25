import {
  type AppPack,
  createChanges,
  createCooked,
  createPantry,
  createShopping,
  type PackLoader,
} from "@cookto/data";
import type { Households } from "@cookto/db";
import {
  type MealDish,
  type MealSlot,
  servingsOn,
  usedBy,
} from "@cookto/engine";
import { matchFood } from "@cookto/engine/names";
import { type Catalogues, render } from "@cookto/templates";
import { householdStore } from "./record-store.js";
import {
  dishNames,
  eatingOf,
  householdPacks,
  live,
  peopleOf,
  plannedOn,
} from "./tomorrow-plan.js";

// The day's meals as the cook's checks name them, and what her answers
// write (specs/242): a meal cooked, as "Cooked it" does, with the recipe's
// amounts out of the pantry; and what ran out, on the shopping list. All
// through the phones' own repositories, on the household's records.

export interface MealToday {
  slot: MealSlot;
  /** "lunch", as a sentence has it. */
  meal: string;
  /** "Lunch", to start one. */
  Meal: string;
  /** Its dishes' names: "Dal tadka, Plain khichdi". */
  dishes: string;
}

const plansOn = async (h: Households, household: string, day: string) =>
  plannedOn((await h.records(household, "plans")).filter(live), day);

/** The meals planned for `day`, in the day's order. */
export async function mealsOn(
  households: Households,
  templates: Catalogues,
  household: string,
  day: string,
  packs?: PackLoader,
): Promise<MealToday[]> {
  const planned = await plansOn(households, household, day);
  const names = dishNames(await householdPacks(households, household, packs));
  const slots = [...new Set(planned.map((p) => p.slot))];
  return slots.map((slot) => {
    const Meal = render(
      templates,
      "en",
      `meal_${slot.replace("-", "_")}`,
      {},
    ).text;
    return {
      slot,
      Meal,
      meal: Meal.toLocaleLowerCase("en"),
      dishes: planned
        .filter((p) => p.slot === slot)
        .map((p) => names[p.dish] ?? p.dish)
        .join(", "),
    };
  });
}

const repositories = (h: Households, household: string, now: () => string) => {
  const store = householdStore(h, household, now);
  const changes = createChanges();
  return {
    cooked: createCooked(store, { changes, now }),
    pantry: createPantry(store, { changes, now }),
    shopping: createShopping(store, { changes, now }),
  };
};

const round = (n: number) => Math.round(n * 100) / 100;

/** The meal made: its dishes cooked on `day`, its amounts used. */
export async function cookedMeal(
  households: Households,
  household: string,
  day: string,
  slot: MealSlot,
  now: () => string,
  packs?: PackLoader,
): Promise<void> {
  const planned = (await plansOn(households, household, day)).filter(
    (p) => p.slot === slot,
  );
  if (planned.length === 0) return;
  const dishes = (await householdPacks(households, household, packs)).flatMap(
    (p) => p.dishes,
  );
  const people = await peopleOf(households, household);
  // Who was out, and the guests, count too (specs/270).
  const eating = await eatingOf(households, household);
  const hasChild = planned.some((p) => p.child);
  const meal: MealDish[] = planned.map((p) => {
    const dish = dishes.find((d) => d.id === p.dish);
    const addIn = dish?.addIns?.find(([id]) => id === p.addIn);
    const own = p.child ? "child" : hasChild;
    return {
      ingredients: dish?.ingredients ?? [],
      ...(dish?.amounts ? { amounts: dish.amounts } : {}),
      people: servingsOn(slot, people, own, day, eating),
      ...(addIn ? { addIn } : {}),
    };
  });
  const r = repositories(households, household, now);
  for (const p of planned) await r.cooked.writer.add(p.dish, day);
  const items = await r.pantry.reader.items();
  for (const used of usedBy(meal, items)) {
    let left = used.amount;
    for (const item of items) {
      if (left <= 0) break;
      if (item.ingredient !== used.ingredient || item.unit !== used.unit)
        continue;
      const had = item.amount ?? 0;
      const rest = round(had - left);
      left = round(left - had);
      if (rest > 0) await r.pantry.writer.setAmount(item.id, rest, used.unit);
      else await r.pantry.writer.useUp(item.id);
    }
  }
}

/** The foods a line names, each part matched against the packs' names. */
function foodsIn(text: string, packs: readonly AppPack[]) {
  const found = new Map<string, string>();
  for (const part of text.split(/,|&|\n|\band\b/i))
    for (const pack of packs) {
      const match = matchFood(part, {
        foods: new Map(Object.entries(pack.names ?? {})),
        ask: new Map(Object.entries(pack.ask ?? {})),
      });
      if (!match || !("food" in match)) continue;
      found.set(match.food, pack.words.en?.ingredients[match.food] ?? part);
      break;
    }
  return found;
}

/** What she says ran out, on the list: the names of what matched. */
export async function ranOut(
  households: Households,
  household: string,
  text: string,
  now: () => string,
  packs?: PackLoader,
): Promise<string[]> {
  const found = foodsIn(
    text,
    await householdPacks(households, household, packs),
  );
  if (found.size === 0) return [];
  const r = repositories(households, household, now);
  await r.shopping.writer.add([...found.keys()]);
  return [...found.values()];
}
