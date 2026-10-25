import { type AppPack, createPacks, type PackLoader } from "@cookto/data";
import type { Households } from "@cookto/db";
import {
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  memberProblems,
  type PantryItem,
  servings,
} from "@cookto/engine";
import { dayWords } from "@cookto/engine/time";
import { type Catalogues, render } from "@cookto/templates";
import {
  type Planned,
  type PlanInput,
  planLines,
  type PlanMeal,
  planMeals,
  tonightLines,
} from "@cookto/usecases";

export type { Planned };

// Tomorrow's plan as the bot sends it (specs/241, specs/270), from the
// household's records: each meal's dish by its name in the packs the
// household loaded, for how many, the child's dishes, the day's name, and
// the cook's "Recipes" page, whose address holds the dishes and how many
// eat each, and nothing else.

export const APP = "https://cookto.day";
/** Where "Change" opens: Tomorrow, inside Telegram, signing in there. */
export const CHANGE = `${APP}/?from=telegram`;

type Row = Record<string, unknown> & { id: string; version: number };

export const live = (r: Row) =>
  r.deletedAt === null || r.deletedAt === undefined;

const bundled = createPacks();
const loaded = new WeakMap<PackLoader, Map<string, Promise<AppPack | null>>>();

/** A cuisine's pack, loaded once; null when it doesn't load. */
export function packOf(id: string, packs: PackLoader = bundled) {
  let of = loaded.get(packs);
  if (!of) {
    of = new Map<string, Promise<AppPack | null>>();
    loaded.set(packs, of);
  }
  let p = of.get(id);
  if (!p) {
    p = packs.load(id).catch(() => null);
    of.set(id, p);
  }
  return p;
}

/** The packs of the cuisines the household loaded. */
export async function householdPacks(
  households: Households,
  household: string,
  packs?: PackLoader,
): Promise<AppPack[]> {
  const [settings] = (
    await households.records(household, "household-settings")
  ).filter(live);
  const kitchen = (settings?.kitchen ?? {}) as { cuisines?: unknown };
  const cuisines = Array.isArray(kitchen.cuisines)
    ? kitchen.cuisines.map(String)
    : [];
  const all = await Promise.all(cuisines.map((id) => packOf(id, packs)));
  return all.filter((p) => p !== null);
}

/** Every dish's English name in these packs. */
export const dishNames = (packs: readonly AppPack[]) =>
  Object.assign(
    {} as Record<string, string>,
    ...packs.map((p) => p.words.en?.dishes ?? {}),
  ) as Record<string, string>;

/**
 * The meal's plan each phone shows: the newest, one per meal and who; with
 * `notMade`, the meals said not made too (specs/270: /today).
 */
export function plannedOn(
  rows: Row[],
  day: string,
  notMade = false,
): Planned[] {
  const newest = new Map<string, Row>();
  for (const r of rows) {
    if (r.on !== day || typeof r.dish !== "string") continue;
    if (r.made === "no" && !notMade) continue;
    const key = `${String(r.slot)}:${r.for === "child" ? "child" : ""}`;
    const had = newest.get(key);
    if (!had || String(r.updatedAt) > String(had.updatedAt)) newest.set(key, r);
  }
  return MEAL_SLOTS.flatMap((slot) =>
    [false, true].flatMap((child) => {
      const r = newest.get(`${slot}:${child ? "child" : ""}`);
      if (!r) return [];
      const addIn = typeof r.addIn === "string" ? { addIn: r.addIn } : {};
      return [{ slot, dish: String(r.dish), child, ...addIn }];
    }),
  );
}

/** The household's people, as the engine counts them. */
export const peopleOf = async (households: Households, household: string) =>
  (await households.records(household, "members"))
    .filter((r) => live(r) && memberProblems(r).length === 0)
    .map((r) => r as unknown as Member);

export interface Tomorrow {
  /** "Thursday". */
  day: string;
  /** The planners' lines, one a message: each meal, with its reason. */
  plan: string;
  /** The cook's: the same, without reasons. */
  cookPlan: string;
  /** "Tonight: soak the chickpeas.", when a dish's prep starts tonight. */
  tonight: string[];
  /** The cook's recipes page for these dishes. */
  recipes: string;
  /** The day's first planned meal. */
  first: MealSlot;
  /** The cook's plan as data, kept to say what changes (specs/270). */
  meals: PlanMeal[];
}

const beansOf = async (households: Households, household: string) => {
  const [settings] = (
    await households.records(household, "household-settings")
  ).filter(live);
  return settings?.beans === "tinned" ? "tinned" : "dried";
};

/** What the plan's lines are made from, for `day`; null when none is planned. */
export async function planInputOf(
  households: Households,
  templates: Catalogues,
  household: string,
  day: string,
  notMade = false,
): Promise<PlanInput | null> {
  const planned = plannedOn(
    (await households.records(household, "plans")).filter(live),
    day,
    notMade,
  );
  if (planned.length === 0) return null;
  return {
    day,
    planned,
    people: await peopleOf(households, household),
    packs: await householdPacks(households, household),
    pantry: (await households.records(household, "pantry"))
      .filter(live)
      .map((r) => r as unknown as PantryItem),
    beans: await beansOf(households, household),
    word: (id, slots = {}) => render(templates, "en", id, slots).text,
    dayName: (d) => dayWords(d, "en", { weekday: "long" }),
  };
}

/** Tomorrow's plan for `day`, "YYYY-MM-DD"; null when nothing is planned. */
export async function tomorrowOf(
  households: Households,
  templates: Catalogues,
  household: string,
  day: string,
): Promise<Tomorrow | null> {
  const input = await planInputOf(households, templates, household, day);
  const first = input?.planned[0];
  if (!input || !first) return null;
  const { planned, people } = input;
  const hasChildDish = (slot: MealSlot) =>
    planned.some((p) => p.slot === slot && p.child);
  const dishes = planned.map(
    (p) =>
      `${p.slot}.${p.dish}.${String(
        servings(p.slot, people, p.child ? "child" : hasChildDish(p.slot)),
      )}`,
  );
  return {
    day: dayWords(day, "en", { weekday: "long" }),
    plan: planLines(input, true).join("\n"),
    cookPlan: planLines(input, false).join("\n"),
    tonight: tonightLines(input),
    recipes: `${APP}/#/cook/${day}?d=${dishes.join(",")}&l=en`,
    first: first.slot,
    meals: planMeals(input),
  };
}
