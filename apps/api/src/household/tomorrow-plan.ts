import { type AppPack, createPacks } from "@cookto/data";
import type { Households } from "@cookto/db";
import {
  MEAL_SLOTS,
  type MealSlot,
  type Member,
  memberProblems,
  servings,
} from "@cookto/engine";
import { dayWords } from "@cookto/engine/time";
import { type Catalogues, render } from "@cookto/templates";
import { tomorrowText } from "@cookto/usecases";

// Tomorrow's plan as the bot sends it (specs/241), from the household's
// records: each meal's dish by its name in the packs the household loaded,
// the child's dishes, the day's name, and the cook's "Recipes" page, whose
// address holds the dishes and how many eat each, and nothing else.

export const APP = "https://cookto.day";
/** Where "Change" opens: Tomorrow, inside Telegram, signing in there. */
export const CHANGE = `${APP}/?from=telegram`;

type Row = Record<string, unknown> & { id: string; version: number };

const live = (r: Row) => r.deletedAt === null || r.deletedAt === undefined;

const packs = createPacks();
const loaded = new Map<string, Promise<AppPack | null>>();
const pack = (id: string) => {
  let p = loaded.get(id);
  if (!p) {
    p = packs.load(id).catch(() => null);
    loaded.set(id, p);
  }
  return p;
};

/** Every dish's English name in these cuisines' packs. */
async function dishNames(cuisines: readonly string[]) {
  const names: Record<string, string> = {};
  for (const id of cuisines)
    Object.assign(names, (await pack(id))?.words.en?.dishes ?? {});
  return names;
}

interface Planned {
  slot: MealSlot;
  dish: string;
  child: boolean;
}

/** The meal's plan each phone shows: the newest, one per meal and who. */
function plannedOn(rows: Row[], day: string): Planned[] {
  const newest = new Map<string, Row>();
  for (const r of rows) {
    if (r.on !== day || typeof r.dish !== "string" || r.made === "no") continue;
    const key = `${String(r.slot)}:${r.for === "child" ? "child" : ""}`;
    const had = newest.get(key);
    if (!had || String(r.updatedAt) > String(had.updatedAt)) newest.set(key, r);
  }
  return MEAL_SLOTS.flatMap((slot) =>
    [false, true].flatMap((child) => {
      const r = newest.get(`${slot}:${child ? "child" : ""}`);
      return r ? [{ slot, dish: String(r.dish), child }] : [];
    }),
  );
}

export interface Tomorrow {
  /** "Thursday". */
  day: string;
  plan: string;
  /** The cook's recipes page for these dishes. */
  recipes: string;
}

/** Tomorrow's plan for `day`, "YYYY-MM-DD"; null when nothing is planned. */
export async function tomorrowOf(
  households: Households,
  templates: Catalogues,
  household: string,
  day: string,
): Promise<Tomorrow | null> {
  const planned = plannedOn(
    (await households.records(household, "plans")).filter(live),
    day,
  );
  if (planned.length === 0) return null;
  const [settings] = (
    await households.records(household, "household-settings")
  ).filter(live);
  const kitchen = (settings?.kitchen ?? {}) as { cuisines?: unknown };
  const names = await dishNames(
    Array.isArray(kitchen.cuisines) ? kitchen.cuisines.map(String) : [],
  );
  const people = (await households.records(household, "members"))
    .filter((r) => live(r) && memberProblems(r).length === 0)
    .map((r) => r as unknown as Member);
  const word = (id: string, slots = {}) =>
    render(templates, "en", id, slots).text;
  const name = (dish: string) => names[dish] ?? dish;
  const plan = tomorrowText(
    {
      meals: planned
        .filter((p) => !p.child)
        .map((p) => ({
          label: word(`meal_${p.slot.replace("-", "_")}`),
          dish: name(p.dish),
        })),
      child: planned.filter((p) => p.child).map((p) => name(p.dish)),
      tonight: [],
      buy: [],
    },
    { childDish: (dish) => word("plan_child", { dish }), buy: () => "" },
  );
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
    plan,
    recipes: `${APP}/#/cook/${day}?d=${dishes.join(",")}&l=en`,
  };
}
