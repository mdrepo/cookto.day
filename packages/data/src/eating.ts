import type { Eating, MealSlot } from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { type SyncRecord, updated } from "./records.js";

// Who's out of a meal on a day, and the guests (specs/270): set from the
// chat, counted on every phone. One record a day and meal, its id from
// them, so every phone and the server write the same one.

export const EATING = "eating";
const TOPIC = "eating";

type Stored = Eating & SyncRecord;

export interface EatingReader {
  all(signal?: AbortSignal): Promise<Eating[]>;
}

export interface EatingWriter {
  /** Someone out of a meal, or back in. */
  setOut(
    on: string,
    slot: MealSlot,
    member: string,
    out: boolean,
  ): Promise<void>;
  /** More guests at a meal. */
  addGuests(on: string, slot: MealSlot, guests: number): Promise<void>;
}

const idOf = (on: string, slot: MealSlot) => `eating:${on}:${slot}`;

export function createEating(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: EatingReader; writer: EatingWriter } {
  async function change(
    on: string,
    slot: MealSlot,
    to: (e: Eating) => Pick<Eating, "out" | "guests">,
  ) {
    const had = await store.get<Stored>(EATING, idOf(on, slot));
    const base: Eating = had ?? { on, slot, out: [], guests: 0 };
    const next = to(base);
    const record: Stored = had
      ? updated(had, next, now())
      : {
          ...base,
          ...next,
          id: idOf(on, slot),
          version: 1,
          updatedAt: now(),
          deletedAt: null,
        };
    await store.put(EATING, [record]);
    changes.announce(TOPIC);
  }
  return {
    reader: {
      async all(signal) {
        return (await store.all<Stored>(EATING, signal))
          .filter((r) => r.deletedAt === null)
          .map(({ on, slot, out, guests }) => ({ on, slot, out, guests }));
      },
    },
    writer: {
      setOut: (on, slot, member, out) =>
        change(on, slot, (e) => ({
          guests: e.guests,
          out: out
            ? [...e.out.filter((m) => m !== member), member]
            : e.out.filter((m) => m !== member),
        })),
      addGuests: (on, slot, guests) =>
        change(on, slot, (e) => ({ out: e.out, guests: e.guests + guests })),
    },
  };
}
