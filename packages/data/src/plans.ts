import type { MealSlot } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord, updated } from "./records.js";

// Meals planned the evening before, and their prep (specs/144), saved as
// sync-ready records, so tomorrow morning shows what was planned tonight.
// Hooks read through the reader; only use cases call the writer.

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
  /** "child": the child's own dish, beside the meal's (specs/145). */
  for?: "child";
  /** The child's dish's extra, chosen when it's planned: "egg". */
  addIn?: string;
}
type Stored = PlannedMeal & SyncRecord;

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
  /** Its prep: done (at `since`, "HH:MM"), or not done. */
  prep(
    on: string,
    slot: MealSlot,
    prep: "done" | "skipped",
    since?: string,
  ): Promise<void>;
}

export function createPlans(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: PlansReader; writer: PlansWriter } {
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(PLANS, signal)).filter(
      (r) => r.deletedAt === null,
    );
  const find = async (on: string, slot: MealSlot, who?: "child") =>
    (await live()).find((r) => r.on === on && r.slot === slot && r.for === who);
  return {
    reader: {
      async all(signal) {
        return (await live(signal)).map(
          ({ id, on, slot, dish, prep, since, for: who, addIn }) => ({
            id,
            on,
            slot,
            dish,
            prep,
            ...(since === undefined ? {} : { since }),
            ...(who === undefined ? {} : { for: who }),
            ...(addIn === undefined ? {} : { addIn }),
          }),
        );
      },
    },
    writer: {
      async plan(on, slot, dish, who) {
        if (await find(on, slot, who)) return;
        await store.put(PLANS, [
          created(
            { on, slot, dish, prep: null, ...(who ? { for: who } : {}) },
            now(),
          ),
        ]);
        changes.announce(TOPIC);
      },
      async addIn(on, slot, addIn) {
        const plan = await find(on, slot, "child");
        if (!plan) return;
        await store.put(PLANS, [updated(plan, { addIn }, now())]);
        changes.announce(TOPIC);
      },
      async remove(on, slot, who) {
        const plan = await find(on, slot, who);
        if (!plan) return;
        await store.put(PLANS, [deleted(plan, now())]);
        changes.announce(TOPIC);
      },
      async prep(on, slot, prep, since) {
        const plan = await find(on, slot);
        if (!plan) return;
        await store.put(PLANS, [
          updated(plan, { prep, ...(since ? { since } : {}) }, now()),
        ]);
        changes.announce(TOPIC);
      },
    },
  };
}
