import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord } from "./records.js";

// My dishes (specs/175): every dish of the packs a household has opened, but
// the ones it took out. Saved is what was taken out, as sync-ready records:
// so nothing changes on the day it ships, and a dish a pack gains later shows
// up. Hooks read through the reader; only use cases call the writer.

export const MY_DISHES = "my-dishes-out";
const TOPIC = "my-dishes";

interface TakenOut {
  id: string;
  /** The dish's id in its pack. */
  dish: string;
}
type Stored = TakenOut & SyncRecord;

export interface MyDishesReader {
  /** The dishes taken out of My dishes. */
  takenOut(signal?: AbortSignal): Promise<string[]>;
}

export interface MyDishesWriter {
  /** Not one this family cooks: no longer planned. */
  takeOut(dish: string): Promise<void>;
  /** Back in My dishes. */
  add(dish: string): Promise<void>;
}

export function createMyDishes(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: MyDishesReader; writer: MyDishesWriter } {
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(MY_DISHES, signal)).filter(
      (r) => r.deletedAt === null,
    );
  return {
    reader: {
      async takenOut(signal) {
        return (await live(signal)).map((r) => r.dish);
      },
    },
    writer: {
      async takeOut(dish) {
        if ((await live()).some((r) => r.dish === dish)) return;
        await store.put(MY_DISHES, [created({ dish }, now())]);
        changes.announce(TOPIC);
      },
      async add(dish) {
        const back = (await live()).filter((r) => r.dish === dish);
        if (back.length === 0) return;
        await store.put(
          MY_DISHES,
          back.map((r) => deleted(r, now())),
        );
        changes.announce(TOPIC);
      },
    },
  };
}
