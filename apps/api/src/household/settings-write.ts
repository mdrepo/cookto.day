import type { Households } from "@cookto/db";

// The server's own writes to the household's settings record (specs/241):
// tomorrow sorted, a day off. Through the same versions and changes log as
// a phone's push (ADR 0033): one version up, and if a phone got there first,
// the change again on its copy. The phones pull it like any other change.

type Row = Record<string, unknown> & { id: string; version: number };

const COLLECTION = "household-settings";
const TRIES = 3;

export async function changeSettings(
  households: Households,
  household: string,
  now: string,
  change: (record: Row) => Record<string, unknown>,
): Promise<void> {
  let [record] = (await households.records(household, COLLECTION)).filter(
    (r) => r.deletedAt === null || r.deletedAt === undefined,
  );
  for (let i = 0; record && i < TRIES; i++) {
    const next = {
      ...record,
      ...change(record),
      version: record.version + 1,
      updatedAt: now,
    };
    const [refused] = await households.put(
      household,
      [{ collection: COLLECTION, record: next }],
      now,
    );
    if (!refused) return;
    record = refused.record;
  }
}

/** Tomorrow approved: "Tomorrow's sorted" on every phone. */
export const sortDay = (
  households: Households,
  household: string,
  day: string,
  now: string,
) => changeSettings(households, household, now, () => ({ sorted: day }));

/** "No cooking": the day is one of the cook's days off (specs/240). */
export const dayOff = (
  households: Households,
  household: string,
  day: string,
  now: string,
) =>
  changeSettings(households, household, now, (r) => {
    const off = (r.daysOff ?? {}) as { weekdays?: unknown; dates?: unknown };
    const dates = Array.isArray(off.dates) ? off.dates.map(String) : [];
    return {
      daysOff: {
        weekdays: Array.isArray(off.weekdays) ? off.weekdays : [],
        dates: dates.includes(day) ? dates : [...dates, day].sort(),
      },
    };
  });
