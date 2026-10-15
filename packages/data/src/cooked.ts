import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord } from "./records.js";

// What the household cooked, and on which day (specs/104), saved as
// sync-ready records, so Today can keep the next days different. Hooks read
// through the reader; only use cases call the writer.

export const COOKED = "cooked";
const TOPIC = "cooked";

export interface Cooked {
  id: string;
  /** The dish's id in its pack. */
  dish: string;
  /** The household's day, "YYYY-MM-DD". */
  on: string;
}
type Stored = Cooked & SyncRecord;

export interface CookedReader {
  all(signal?: AbortSignal): Promise<Cooked[]>;
}

export interface CookedWriter {
  /** A dish cooked on a day; once a day is enough. */
  add(dish: string, on: string): Promise<void>;
  /** Not cooked that day after all (#116). */
  remove(dish: string, on: string): Promise<void>;
}

export function createCooked(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: CookedReader; writer: CookedWriter } {
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(COOKED, signal)).filter(
      (r) => r.deletedAt === null,
    );
  return {
    reader: {
      async all(signal) {
        return (await live(signal)).map(({ id, dish, on }) => ({
          id,
          dish,
          on,
        }));
      },
    },
    writer: {
      async add(dish, on) {
        if ((await live()).some((r) => r.dish === dish && r.on === on)) return;
        await store.put(COOKED, [created({ dish, on }, now())]);
        changes.announce(TOPIC);
      },
      async remove(dish, on) {
        const gone = (await live()).filter(
          (r) => r.dish === dish && r.on === on,
        );
        if (gone.length === 0) return;
        await store.put(
          COOKED,
          gone.map((r) => deleted(r, now())),
        );
        changes.announce(TOPIC);
      },
    },
  };
}
