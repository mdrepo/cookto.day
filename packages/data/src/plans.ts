import type { MealSlot } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord, updated } from "./records.js";

// Meals planned the evening before, and their prep (specs/144), saved as
// sync-ready records, so tomorrow morning shows what was planned tonight.
// Hooks read through the reader; only use cases call the writer. A plan's id
// is made from its day, meal and who it's for (specs/236), so every phone,
// and the server, saving one meal writes one record. Plans saved before keep
// their random ids: the newest of a meal's shows, and its next change lands
// on the one id and marks the others deleted.

export const PLANS = "plans";
const TOPIC = "plans";

export interface PlannedMeal {
  id: string;
  /** The meal's day, "YYYY-MM-DD". */
  on: string;
  slot: MealSlot;
  dish: string;
  /** Marked done the evening before, or "No" in the morning. */
  prep: "done" | "skipped" | null;
  /** When it was marked done, "HH:MM". */
  since?: string;
  /** "no": it wasn't made after all (specs/195); else it counts as made. */
  made?: "no";
  /** "child": the child's own dish, beside the meal's (specs/145). */
  for?: "child";
  /** The child's dish's extra, chosen when it's planned: "egg". */
  addIn?: string;
}
type Stored = PlannedMeal & SyncRecord;

/** The one id of a meal's plan (specs/236): "plan:2026-10-22:dinner". */
export const planId = (on: string, slot: MealSlot, who?: "child") =>
  `plan:${on}:${slot}${who ? `:${who}` : ""}`;

/**
 * The later of a meal's two plans: changed later, then the higher version,
 * then the higher id, so every phone picks the same one.
 */
const newer = (a: Stored, b: Stored) => {
  if (b.updatedAt !== a.updatedAt) return b.updatedAt > a.updatedAt ? b : a;
  if (b.version !== a.version) return b.version > a.version ? b : a;
  return b.id > a.id ? b : a;
};

/** The newest plan of each meal: one, whatever was saved before. */
function onePerMeal(rows: Stored[]): Stored[] {
  const meals = new Map<string, Stored>();
  for (const row of rows) {
    const id = planId(row.on, row.slot, row.for);
    const had = meals.get(id);
    meals.set(id, had ? newer(had, row) : row);
  }
  return [...meals.values()];
}

export interface PlansReader {
  all(signal?: AbortSignal): Promise<PlannedMeal[]>;
}

export interface PlansWriter {
  /**
   * A meal's dish, or the child's beside it; the first plan for a day, slot
   * and who it's for stays.
   */
  plan(on: string, slot: MealSlot, dish: string, who?: "child"): Promise<void>;
  /** The child's dish's add-in (specs/145). */
  addIn(on: string, slot: MealSlot, addIn: string): Promise<void>;
  /** Not planned after all: the child shares the meal again. */
  remove(on: string, slot: MealSlot, who?: "child"): Promise<void>;
  /** Another dish for a planned meal (specs/195): its prep starts over. */
  swap(on: string, slot: MealSlot, dish: string): Promise<void>;
  /** "Didn't make it" (specs/195): the dish is free to be picked again. */
  notMade(on: string, slot: MealSlot): Promise<void>;
  /** Its prep: done (at `since`, "HH:MM"), or not done. */
  prep(
    on: string,
    slot: MealSlot,
    prep: "done" | "skipped",
    since?: string,
  ): Promise<void>;
}

/** Reading a meal's plans, and writing one at its id (specs/236). */
function meals(store: RecordStore, now: () => string) {
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(PLANS, signal)).filter(
      (r) => r.deletedAt === null,
    );
  const meal = async (on: string, slot: MealSlot, who?: "child") =>
    (await live()).filter(
      (r) => r.on === on && r.slot === slot && r.for === who,
    );
  const find = async (on: string, slot: MealSlot, who?: "child") => {
    const rows = await meal(on, slot, who);
    return rows.length > 0 ? rows.reduce(newer) : undefined;
  };
  /**
   * A meal's plan changed by `change`, written at its one id, a version
   * above whatever that id held; any other plan of the meal marked deleted.
   */
  async function rewrite(
    on: string,
    slot: MealSlot,
    who: "child" | undefined,
    change: (plan: Stored) => Stored,
  ): Promise<boolean> {
    const rows = await meal(on, slot, who);
    if (rows.length === 0) return false;
    const id = planId(on, slot, who);
    const held = await store.get<Stored>(PLANS, id);
    const plan = rows.reduce(newer);
    const next = change({
      ...plan,
      id,
      version: Math.max(plan.version, held?.version ?? 0),
    });
    const others = rows
      .filter((r) => r.id !== id)
      .map((r) => deleted(r, now()));
    await store.put(PLANS, [next, ...others]);
    return true;
  }
  return { live, find, rewrite };
}

export function createPlans(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: PlansReader; writer: PlansWriter } {
  const { live, find, rewrite: write } = meals(store, now);
  const rewrite = async (...args: Parameters<typeof write>) => {
    if (await write(...args)) changes.announce(TOPIC);
  };
  return {
    reader: {
      async all(signal) {
        return onePerMeal(await live(signal)).map(
          ({ id, on, slot, dish, prep, since, made, for: who, addIn }) => ({
            id,
            on,
            slot,
            dish,
            prep,
            ...(since === undefined ? {} : { since }),
            ...(made === undefined ? {} : { made }),
            ...(who === undefined ? {} : { for: who }),
            ...(addIn === undefined ? {} : { addIn }),
          }),
        );
      },
    },
    writer: {
      async plan(on, slot, dish, who) {
        if (await find(on, slot, who)) return;
        const id = planId(on, slot, who);
        const held = await store.get<Stored>(PLANS, id);
        // Planned already, by a call that ran alongside this one.
        if (held && held.deletedAt === null) return;
        const fields = {
          on,
          slot,
          dish,
          prep: null,
          ...(who ? { for: who } : {}),
        };
        const record: Stored = {
          ...created(fields, now()),
          id,
          version: (held?.version ?? 0) + 1,
        };
        await store.put(PLANS, [record]);
        changes.announce(TOPIC);
      },
      async addIn(on, slot, addIn) {
        await rewrite(on, slot, "child", (p) => updated(p, { addIn }, now()));
      },
      async swap(on, slot, dish) {
        if (!(await find(on, slot))) return this.plan(on, slot, dish);
        await rewrite(on, slot, undefined, (p) => {
          const swapped = updated(p, { dish, prep: null }, now());
          delete swapped.since;
          return swapped;
        });
      },
      async notMade(on, slot) {
        await rewrite(on, slot, undefined, (p) =>
          updated(p, { made: "no" }, now()),
        );
      },
      async remove(on, slot, who) {
        await rewrite(on, slot, who, (p) => deleted(p, now()));
      },
      async prep(on, slot, prep, since) {
        await rewrite(on, slot, undefined, (p) =>
          updated(p, { prep, ...(since ? { since } : {}) }, now()),
        );
      },
    },
  };
}
