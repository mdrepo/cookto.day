import {
  createChanges,
  createCooked,
  createHousehold,
  createMyDishes,
  createPantry,
  createPlans,
  type PackLoader,
} from "@cookto/data";
import type { Households } from "@cookto/db";
import type { MealSlot } from "@cookto/engine";
import { mealIdeas } from "@cookto/usecases";
import { householdStore } from "./record-store.js";
import { clockOf, schedule } from "./schedule.js";
import { dishNames, householdPacks, live } from "./tomorrow-plan.js";

// A meal's other ideas for "Change" in the chat (specs/270): the ones
// Tomorrow on the phone ranks next, from the household's records read
// through the phones' own repositories, ranked by the same use case.

export interface Idea {
  id: string;
  name: string;
}

/** How many ideas the chat offers. */
const SHOWN = 3;

/** Its planned dish, and the next ideas for it, best first. */
export async function ideasFor(
  households: Households,
  household: string,
  day: string,
  slot: MealSlot,
  now: () => string,
  packLoader?: PackLoader,
): Promise<{ current: Idea | null; ideas: Idea[] }> {
  const store = householdStore(households, household, now);
  const o = { changes: createChanges(), now };
  const packs = await householdPacks(households, household, packLoader);
  const out = new Set(await createMyDishes(store, o).reader.takenOut());
  const [settings] = (
    await households.records(household, "household-settings")
  ).filter(live);
  const kitchen = (settings?.kitchen ?? {}) as { skip?: unknown };
  const plans = await createPlans(store, o).reader.all();
  const clock = clockOf(await schedule(households, household), now());
  const ideas = mealIdeas({
    packs,
    dishes: packs.flatMap((p) => p.dishes).filter((d) => !out.has(d.id)),
    skip: Array.isArray(kitchen.skip) ? kitchen.skip.map(String) : [],
    beans: settings?.beans === "tinned" ? "tinned" : "dried",
    pantry: await createPantry(store, o).reader.items(),
    members: await createHousehold(store, o).reader.members(),
    history: await createCooked(store, o).reader.all(),
    plans,
    now: clock ? `${clock.day}T${clock.time}` : now().slice(0, 16),
  });
  const meals = day === ideas.next ? ideas.tomorrow : ideas.today;
  const names = dishNames(packs);
  const named = (id: string) => ({ id, name: names[id] ?? id });
  const planned = plans.find(
    (p) => p.on === day && p.slot === slot && !p.for && p.made !== "no",
  );
  const ranked = meals?.find((m) => m.slot === slot)?.suggestions ?? [];
  return {
    current: planned ? named(planned.dish) : null,
    ideas: ranked
      .filter((s) => s.dish.id !== planned?.dish)
      .slice(0, SHOWN)
      .map((s) => named(s.dish.id)),
  };
}
