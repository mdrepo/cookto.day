import {
  type DaysOff,
  MEAL_SLOTS,
  MEAL_TIMES,
  type MealTimes,
} from "@cookto/engine";
import type { Changes } from "./changes.js";
import type { KeyValue } from "./kv.js";
import type { RecordStore } from "./record-store.js";
import { created, type SyncRecord, updated } from "./records.js";
import { SCHEDULE_KEY, type Schedule } from "./schedule.js";
import {
  BEANS,
  type Beans,
  type BeansWriter,
  type KitchenSettings,
  type KitchenSettingsWriter,
  readKitchen,
  type SettingsStore,
  type SettingsWriter,
  type WhoCooksWriter,
} from "./settings.js";

// The household's settings as one synced record (specs/217, specs/240):
// the kitchen, the country, the beans, the day that's sorted, the time
// zone, meal times and days off. Hooks keep reading the settings store;
// a write of one of these saves the record too, at its one id, so every
// phone and the server keep one copy. A copy pulled from another phone
// lands in the store without being saved back. Its own entry,
// "@cookto/data/household-settings": a phone loads it once it signs in.

export const HOUSEHOLD_SETTINGS = "household-settings";
export const HOUSEHOLD_SETTINGS_ID = "household";

interface Shared extends Schedule {
  kitchen: KitchenSettings;
  country: string;
  beans: Beans;
  sorted: string | null;
}
type Stored = Shared & SyncRecord;

/** The schedule (specs/240), for its use cases only. */
export interface ScheduleWriter {
  timeZone(): string | null;
  mealTimes(): MealTimes;
  daysOff(): DaysOff;
  setTimeZone(zone: string): void;
  setMealTimes(times: MealTimes): void;
  setDaysOff(daysOff: DaysOff): void;
}

/** The record itself, for the household's use cases. */
export interface SharedSettings {
  /** Waits until every write so far is saved in the record. */
  saved(): Promise<void>;
  /** Saves the record from what this phone has, when it has none or differs. */
  ensure(): Promise<void>;
}

type Setters = SettingsWriter &
  KitchenSettingsWriter &
  BeansWriter &
  WhoCooksWriter;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** Another phone's schedule, as far as it makes sense; else each part's start. */
export function readSchedule(value: unknown): Schedule {
  const v = (value ?? {}) as Partial<Record<keyof Schedule, unknown>>;
  const times = (v.mealTimes ?? {}) as Partial<Record<string, unknown>>;
  const off = (v.daysOff ?? {}) as Partial<Record<keyof DaysOff, unknown>>;
  const mealTimes = { ...MEAL_TIMES };
  for (const slot of MEAL_SLOTS) {
    const time = times[slot];
    if (typeof time === "string" && HHMM.test(time)) mealTimes[slot] = time;
  }
  return {
    timeZone: typeof v.timeZone === "string" ? v.timeZone : null,
    mealTimes,
    daysOff: {
      weekdays: list(off.weekdays).filter(
        (d): d is number =>
          Number.isInteger(d) && Number(d) >= 0 && Number(d) <= 6,
      ),
      dates: list(off.dates).filter(
        (d): d is string => typeof d === "string" && DAY.test(d),
      ),
    },
  };
}

/** What the record holds, from the settings as they are now. */
function sharedOf(store: SettingsStore): Shared {
  const s = store.getState();
  return {
    kitchen: s.kitchen,
    country: s.country,
    beans: s.beans,
    sorted: s.sorted,
    timeZone: s.timeZone,
    mealTimes: s.mealTimes,
    daysOff: s.daysOff,
  };
}

const same = (record: Stored, shared: Shared) =>
  (Object.keys(shared) as (keyof Shared)[]).every(
    (k) => JSON.stringify(record[k]) === JSON.stringify(shared[k]),
  );

/** The schedule in the store, and remembered on this phone. */
function keepSchedule(
  store: SettingsStore,
  kv: KeyValue,
  schedule: Partial<Schedule>,
): void {
  store.setState(schedule);
  const { timeZone, mealTimes, daysOff } = store.getState();
  try {
    kv.set(SCHEDULE_KEY, JSON.stringify({ timeZone, mealTimes, daysOff }));
  } catch {
    // Not remembered, but the screen still shows it.
  }
}

/** Another phone's copy, pulled: into the store, through the plain writer. */
function follow(writer: Setters, r: Stored, keep: (s: Schedule) => void) {
  if (typeof r.country === "string" && writer.knowsCountry(r.country))
    writer.setCountry(r.country);
  const beans = BEANS.find((b) => b === r.beans);
  if (beans) writer.setBeans(beans);
  if (typeof r.sorted === "string") writer.setSorted(r.sorted);
  writer.setKitchen(readKitchen(JSON.stringify(r.kitchen)));
  keep(readSchedule(r));
}

export function shareSettings<W extends Setters>(
  settings: { store: SettingsStore; writer: W },
  store: RecordStore,
  o: { changes: Changes; kv: KeyValue; now?: () => string },
): W & ScheduleWriter & SharedSettings {
  const { writer } = settings;
  const now = o.now ?? (() => new Date().toISOString());
  // One save at a time, in order, so each is one version up.
  let queue: Promise<void> = Promise.resolve();
  const later = (work: () => Promise<void>) => {
    queue = queue.then(work).catch(() => undefined);
    return queue;
  };
  const record = () =>
    store.get<Stored>(HOUSEHOLD_SETTINGS, HOUSEHOLD_SETTINGS_ID);
  /** A write saves one version up; `ensure` only when something differs. */
  const save = (onlyIfChanged = false) =>
    later(async () => {
      const had = await record();
      const shared = sharedOf(settings.store);
      if (had && onlyIfChanged && same(had, shared)) return;
      const next: Stored = had
        ? updated(had, shared, now())
        : { ...created(shared, now()), id: HOUSEHOLD_SETTINGS_ID };
      await store.put(HOUSEHOLD_SETTINGS, [next]);
    });
  const keep = (s: Partial<Schedule>) => {
    keepSchedule(settings.store, o.kv, s);
  };
  o.changes.subscribe((topic) => {
    if (topic !== HOUSEHOLD_SETTINGS) return;
    void later(async () => {
      const r = await record();
      if (r && r.deletedAt === null) follow(writer, r, keep);
    });
  });
  const sharing =
    <A extends unknown[]>(set: (...a: A) => void) =>
    (...a: A) => {
      set(...a);
      void save();
    };
  const scheduling =
    <A extends unknown[]>(change: (...a: A) => Partial<Schedule>) =>
    (...a: A) => {
      keep(change(...a));
      void save();
    };
  return {
    ...writer,
    setKitchen: sharing((k: KitchenSettings) => {
      writer.setKitchen(k);
    }),
    setCountry: sharing((c: string) => {
      writer.setCountry(c);
    }),
    setBeans: sharing((b: Beans) => {
      writer.setBeans(b);
    }),
    setSorted: sharing((on: string) => {
      writer.setSorted(on);
    }),
    timeZone: () => settings.store.getState().timeZone,
    mealTimes: () => settings.store.getState().mealTimes,
    daysOff: () => settings.store.getState().daysOff,
    setTimeZone: scheduling((timeZone: string) => ({ timeZone })),
    setMealTimes: scheduling((mealTimes: MealTimes) => ({ mealTimes })),
    setDaysOff: scheduling((daysOff: DaysOff) => ({ daysOff })),
    saved: () => queue,
    ensure: () => save(true),
  };
}
