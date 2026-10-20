import {
  type Changes,
  type Clearable,
  type Cook,
  type HouseholdApi,
  type HouseholdView,
  type MemberRow,
  type PushedRecord,
  type RecordStore,
  type Sync,
  SYNC_TOPICS,
  type SyncApi,
  type SyncOutcome,
  type SyncRecord,
} from "@cookto/data";
import { ApiError } from "@cookto/data/network";
import type {
  CookWriter,
  KitchenSettingsWriter,
  SignInWriter,
} from "@cookto/data/write";

// The household on the server (specs/217, ADR 0033): signing in starts one
// from this phone's records, or joins the one the account has, replacing
// this phone's kitchen when it had one of its own. Leaving and deleting
// the account. The phone's copy stays what screens show throughout.

export interface HouseholdSync {
  api: HouseholdApi & SyncApi;
  /** The store itself, to read every record and to clear a collection. */
  store: RecordStore & Clearable;
  sync: Sync;
  settings: SignInWriter & KitchenSettingsWriter & CookWriter;
  changes: Changes;
  /** This moment, ISO, for when the cook joined this phone; the app passes it. */
  now?: () => string;
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

/** The household's cook, reflected on this phone. */
async function followCook(d: HouseholdSync): Promise<void> {
  const view = await currentHousehold(d).catch(() => null);
  if (view)
    reflectCook(d.settings, d.settings.cook(), view.members, d.now?.() ?? "");
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

/**
 * The cook as the household has her: connected through it when it has a
 * cook and this phone has none; forgotten when it has none and this phone
 * had her through it. A phone's own link (a token) is left alone.
 */
export function reflectCook(
  settings: CookWriter,
  cook: Cook | null,
  members: readonly MemberRow[],
  now: string,
): void {
  const there = members.some((m) => m.role === "cook" && !m.stopped);
  if (there && cook === null)
    settings.setCook({
      token: null,
      connectedAt: now,
      sent: null,
      scheduled: null,
    });
  else if (!there && cook?.token === null) settings.setCook(null);
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
    const held = d.settings.cook();
    try {
      await d.api.createHousehold(
        await everything(d),
        held?.token ?? undefined,
      );
    } catch (again) {
      return outcomeOf(d, again);
    }
    // Her link went with the household: this phone sends through it now.
    if (held?.token) d.settings.setCook({ ...held, token: null });
    d.sync.reset();
    await d.sync.run();
    return "started";
  }
  if (await phoneHasOwnKitchen(d)) return "ask";
  await replaceWithHousehold(d);
  await followCook(d);
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
