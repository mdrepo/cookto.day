import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord } from "./records.js";

// The shopping list (specs/103): what to buy, from what dishes need or
// typed in. Saved as sync-ready records, like the pantry. Hooks read through
// the reader; only use cases call the writer.

export const SHOPPING = "shopping";
const TOPIC = "shopping";

/** One thing to buy: a pack's ingredient by its id, or words as typed. */
export interface ListItem {
  id: string;
  /** A pack's ingredient (a Wikidata id), or the words someone typed. */
  ingredient: string;
}
/** When it was added, and its place in that batch: the list keeps that order. */
type Stored = ListItem & SyncRecord & { addedAt: string; place: number };

export interface ShoppingReader {
  /** What's on the list, in the order added. */
  items(signal?: AbortSignal): Promise<ListItem[]>;
}

export interface ShoppingWriter {
  /** Adds what isn't on the list yet; returns how many it added. */
  add(ingredients: readonly string[]): Promise<number>;
  remove(id: string): Promise<void>;
}

export function createShopping(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: ShoppingReader; writer: ShoppingWriter } {
  // The store lists records by id; the list is in the order added.
  const live = async (signal?: AbortSignal) =>
    (await store.all<Stored>(SHOPPING, signal))
      .filter((r) => r.deletedAt === null)
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt) || a.place - b.place);
  return {
    reader: {
      async items(signal) {
        return (await live(signal)).map(({ id, ingredient }) => ({
          id,
          ingredient,
        }));
      },
    },
    writer: {
      async add(ingredients) {
        const on = new Set((await live()).map((r) => r.ingredient));
        const fresh = [...new Set(ingredients)].filter((i) => !on.has(i));
        if (fresh.length === 0) return 0;
        const at = now();
        await store.put(
          SHOPPING,
          fresh.map((ingredient, place) =>
            created({ ingredient, addedAt: at, place }, at),
          ),
        );
        changes.announce(TOPIC);
        return fresh.length;
      },
      async remove(id) {
        const record = await store.get<Stored>(SHOPPING, id);
        if (!record) return;
        await store.put(SHOPPING, [deleted(record, now())]);
        changes.announce(TOPIC);
      },
    },
  };
}
