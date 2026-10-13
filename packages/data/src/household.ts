import {
  defaultMeals,
  type MealSlot,
  type Member,
  type MemberKind,
  memberProblems,
} from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { RecordStore } from "./record-store.js";
import { created, deleted, type SyncRecord, updated } from "./records.js";

// The household's people and their meals (ADR 0026), saved as sync-ready
// records. Hooks read through the reader; only use cases call the writer.

export const MEMBERS = "members";
const TOPIC = "household";

type Stored = Member & SyncRecord;

export interface HouseholdReader {
  /** Everyone in the household, in the order added. */
  members(signal?: AbortSignal): Promise<Member[]>;
}

export interface HouseholdWriter {
  addMember(kind: MemberKind, nickname?: string): Promise<Member>;
  setMeals(id: string, meals: readonly MealSlot[]): Promise<void>;
  /** A name, or none: then the app calls them "Adult", "Child 2" and so on. */
  setNickname(id: string, nickname: string | undefined): Promise<void>;
  removeMember(id: string): Promise<void>;
}

/** The person as the app sees them, without the record's sync fields. */
function asMember({ id, kind, nickname, meals }: Stored): Member {
  return nickname === undefined
    ? { id, kind, meals }
    : { id, kind, nickname, meals };
}

export function createHousehold(
  store: RecordStore,
  {
    changes,
    now = () => new Date().toISOString(),
  }: { changes: Changes; now?: () => string },
): { reader: HouseholdReader; writer: HouseholdWriter } {
  async function save(record: Stored) {
    await store.put(MEMBERS, [record]);
    changes.announce(TOPIC);
  }
  async function stored(id: string): Promise<Stored> {
    const record = await store.get<Stored>(MEMBERS, id);
    if (!record) throw new Error(`No person ${id} in the household.`);
    return record;
  }
  return {
    reader: {
      async members(signal) {
        const records = await store.all<Stored>(MEMBERS, signal);
        // A person the engine finds wrong is left out, not planned from.
        return records
          .filter((r) => r.deletedAt === null && memberProblems(r).length === 0)
          .map(asMember);
      },
    },
    writer: {
      async addMember(kind, nickname) {
        const fields = { kind, meals: defaultMeals(kind) };
        const record: Stored = created(
          nickname === undefined ? fields : { ...fields, nickname },
          now(),
        );
        await save(record);
        return asMember(record);
      },
      async setMeals(id, meals) {
        await save(updated(await stored(id), { meals }, now()));
      },
      async setNickname(id, nickname) {
        const person = { ...(await stored(id)) };
        delete person.nickname;
        if (nickname !== undefined) person.nickname = nickname;
        await save(updated(person, {}, now()));
      },
      async removeMember(id) {
        await save(deleted(await stored(id), now()));
      },
    },
  };
}
