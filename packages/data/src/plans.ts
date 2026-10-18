import type { MealSlot } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, type SyncRecord, updated } from "./records.js";

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
}
type Stored = PlannedMeal & SyncRecord;

export interface PlansReader {
  all(signal?: AbortSignal): Promise<PlannedMeal[]>;
}

export interface PlansWriter {
  /** A meal's dish; the first plan for a day and slot stays. */
  plan(on: string, slot: MealSlot, dish: string): Promise<void>;
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
  const find = async (on: string, slot: MealSlot) =>
    (await live()).find((r) => r.on === on && r.slot === slot);
  return {
    reader: {
      async all(signal) {
        return (await live(signal)).map(
          ({ id, on, slot, dish, prep, since }) => ({
            id,
            on,
            slot,
            dish,
            prep,
            ...(since === undefined ? {} : { since }),
          }),
        );
      },
    },
    writer: {
      async plan(on, slot, dish) {
        if (await find(on, slot)) return;
        await store.put(PLANS, [
          created({ on, slot, dish, prep: null }, now()),
        ]);
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
