import type { RecordStore } from "@cookto/data";
import type { Households, PushedRecord } from "@cookto/db";

// A household's records as the phones' repositories read and write them
// (specs/242): the server cooks, uses up and lists through the same code as
// the app, so a phone that pulls sees what "Cooked it" would have written.
// Writes go through the same versions and changes log as a push (ADR 0033).

export function householdStore(
  households: Households,
  household: string,
  now: () => string,
): RecordStore {
  return {
    async get<T>(collection: string, id: string) {
      const all = await households.records(household, collection);
      return (all.find((r) => r.id === id) ?? null) as T | null;
    },
    async all<T>(collection: string) {
      return (await households.records(household, collection)) as T[];
    },
    async put(collection, records) {
      await households.put(
        household,
        records.map((r) => ({
          collection,
          record: r as PushedRecord["record"],
        })),
        now(),
      );
    },
  };
}
