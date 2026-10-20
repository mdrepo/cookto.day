import {
  type Changes,
  type Clearable,
  type HouseholdApi,
  type HouseholdView,
  type PushedRecord,
  type RecordStore,
  type Sync,
  SYNC_TOPICS,
  type SyncApi,
  type SyncOutcome,
  type SyncRecord,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import type { KitchenSettingsWriter, SignInWriter } from "@cookto/data/write";

// The household on the server (specs/217, ADR 0033): signing in starts one
// from this phone's records, or joins the one the account has, replacing
// this phone's kitchen when it had one of its own. Leaving and deleting
// the account. The phone's copy stays what screens show throughout.

export interface HouseholdSync {
  api: HouseholdApi & SyncApi;
  /** The store itself, to read every record and to clear a collection. */
  store: RecordStore & Clearable;
  sync: Sync;
  settings: SignInWriter & KitchenSettingsWriter;
  changes: Changes;
}

/** The collections a household shares, and what each announces. */
export const SYNCED = Object.keys(SYNC_TOPICS);

export type Joined =
  "started" | "joined" | "ask" | "offline" | "signed-out" | "failed";

type Stored = SyncRecord & Record<string, unknown>;

/** Every record this phone has, whole, as the server takes them. */
async function everything({ store }: HouseholdSync): Promise<PushedRecord[]> {
  const records: PushedRecord[] = [];
  for (const collection of SYNCED)
    for (const record of await store.all<Stored>(collection))
      records.push({ collection, record });
  return records;
}

/**
 * Whether this phone has a kitchen of its own worth asking about: records
 * of its own, or cuisines loaded, and not just the sample it was given.
 */
export async function phoneHasOwnKitchen(d: HouseholdSync): Promise<boolean> {
  const kitchen = d.settings.kitchen();
  if (kitchen.sample !== null) return false;
  for (const collection of SYNCED) {
    const records = await d.store.all<Stored>(collection);
    if (records.some((r) => r.deletedAt === null)) return true;
  }
  return kitchen.cuisines.length > 0;
}

/** This phone's copy goes, and the household's comes: screens see both. */
export async function replaceWithHousehold(d: HouseholdSync): Promise<void> {
  for (const collection of SYNCED) {
    await d.store.clear(collection);
    d.changes.announce(SYNC_TOPICS[collection] ?? collection);
  }
  d.sync.reset();
  await d.sync.run();
}

/** The account's household as the API answers it, or null when it has none. */
export async function currentHousehold(
  d: HouseholdSync,
): Promise<HouseholdView | null> {
  try {
    return await d.api.household();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** What a failed call comes to, by the API's answer. */
function outcomeOf(d: HouseholdSync, error: unknown): Joined {
  if (!(error instanceof ApiError)) return "failed";
  if (error.status === 0) return "offline";
  if (error.status === 401) {
    d.settings.setSignedIn(null);
    return "signed-out";
  }
  return "failed";
}

/**
 * Right after signing in: the account's household, joined, or started from
 * this phone's records when it has none. "ask" when this phone has a
 * kitchen of its own that joining would replace.
 */
export async function joinOrStart(d: HouseholdSync): Promise<Joined> {
  try {
    await d.api.household();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404)
      return outcomeOf(d, error);
    try {
      await d.api.createHousehold(await everything(d));
    } catch (again) {
      return outcomeOf(d, again);
    }
    d.sync.reset();
    await d.sync.run();
    return "started";
  }
  if (await phoneHasOwnKitchen(d)) return "ask";
  await replaceWithHousehold(d);
  return "joined";
}

/** "Leave": the membership ends; this phone's copy goes with it. */
export async function leaveHousehold(
  d: HouseholdSync,
  member: string,
): Promise<void> {
  await d.api.removeMember(member);
  for (const collection of SYNCED) {
    await d.store.clear(collection);
    d.changes.announce(SYNC_TOPICS[collection] ?? collection);
  }
  d.sync.reset();
}

/** "Delete my account": the server forgets; this phone keeps its copy. */
export async function deleteAccount(d: HouseholdSync): Promise<void> {
  await d.api.deleteAccount();
  d.settings.setSignedIn(null);
  d.sync.reset();
}

/** A sync now; a session found gone signs this phone out. */
export async function syncNow(d: HouseholdSync): Promise<SyncOutcome> {
  const outcome = await d.sync.run();
  if (outcome === "signed-out") d.settings.setSignedIn(null);
  return outcome;
}
