import type { Condition, PantryItem, Unit } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import {
  created,
  deleted,
  restored,
  type SyncRecord,
  updated,
} from "./records.js";

// The pantry (ADR 0027): what's in the kitchen, how much, and how it is,
// saved as sync-ready records. Hooks read through the reader; only use
// cases call the writer.

export const PANTRY = "pantry";
const TOPIC = "pantry";

/** An item as the app sees it: sample items are marked, for clearing. */
export type KitchenItem = PantryItem & { sample: boolean };
export type NewItem = Omit<PantryItem, "id">;
type Stored = PantryItem & { sample?: true } & SyncRecord;

export interface PantryReader {
  /** What's in the pantry, in the order added. */
  items(signal?: AbortSignal): Promise<KitchenItem[]>;
}

export interface PantryWriter {
  add(
    items: readonly NewItem[],
    options?: { sample?: boolean },
  ): Promise<KitchenItem[]>;
  /** A new amount, or none ("have it"). */
  setAmount(
    id: string,
    amount: number | undefined,
    unit: Unit | undefined,
  ): Promise<void>;
  /** The person's mark, or none: then the date says. */
  mark(id: string, condition: Condition | undefined): Promise<void>;
  useUp(id: string): Promise<void>;
  /** Food used up by mistake, back as it was (#116). */
  bringBack(id: string): Promise<void>;
  removeSample(): Promise<void>;
}

function asItem(record: Stored): KitchenItem {
  const item = without(record, ["version", "updatedAt", "deletedAt", "sample"]);
  return { ...(item as PantryItem), sample: record.sample === true };
}

/** The record without `keys`, so an unset field isn't stored as undefined. */
function without(record: Stored, keys: readonly (keyof Stored)[]): Stored {
  const copy = { ...record };
  for (const key of keys) Reflect.deleteProperty(copy, key);
  return copy;
}

export function createPantry(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: PantryReader; writer: PantryWriter } {
  async function save(records: Stored[]) {
    await store.put(PANTRY, records);
    changes.announce(TOPIC);
  }
  async function stored(id: string): Promise<Stored> {
    const record = await store.get<Stored>(PANTRY, id);
    if (!record) throw new Error(`No item ${id} in the pantry.`);
    return record;
  }
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(PANTRY, signal)).filter(
      (r) => r.deletedAt === null,
    );
  return {
    reader: {
      async items(signal) {
        return (await live(signal)).map(asItem);
      },
    },
    writer: {
      async add(items, options = {}) {
        const records = items.map(
          (item) =>
            created(
              options.sample ? { ...item, sample: true as const } : item,
              now(),
            ) as Stored,
        );
        await save(records);
        return records.map(asItem);
      },
      async setAmount(id, amount, unit) {
        const record = without(await stored(id), ["amount", "unit"]);
        const fields =
          amount === undefined || unit === undefined ? {} : { amount, unit };
        await save([updated(record, fields, now())]);
      },
      async mark(id, condition) {
        const record = without(await stored(id), ["mark"]);
        await save([
          updated(record, condition ? { mark: condition } : {}, now()),
        ]);
      },
      async useUp(id) {
        await save([deleted(await stored(id), now())]);
      },
      async bringBack(id) {
        await save([restored(await stored(id), now())]);
      },
      async removeSample() {
        const sample = (await live()).filter((r) => r.sample === true);
        if (sample.length > 0) await save(sample.map((r) => deleted(r, now())));
      },
    },
  };
}
