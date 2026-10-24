// Data (ADR 0022, 0024): repositories, the store, and how data is stored,
// cached and synced. Screen hooks read through ./read; only use cases import
// ./write. The app creates them here, handing in the browser's storage.
export { createChanges, type Changes } from "./changes.js";
export { createCooked, type Cooked } from "./cooked.js";
export { createMyDishes } from "./my-dishes.js";
export { createHousehold } from "./household.js";
export { memoryKeyValue, type KeyValue } from "./kv.js";
// The network adapter's code is "@cookto/data/network", its own entry, so
// the app loads it only when it first calls our API (specs/207). Its types
// are here for everyone.
export type {
  Api,
  ApiOptions,
  Change,
  HouseholdApi,
  HouseholdSendApi,
  HouseholdView,
  LinkMade,
  MemberRow,
  Pulled,
  PushedRecord,
  LinkState,
  Send,
  SendRequest,
  SignInApi,
  SignInStatus,
  SyncApi,
} from "./network.js";
export {
  type AppPack,
  type DishPhoto,
  createPacks,
  type Cuisine,
  type PackLoader,
  type PackWords,
  STAPLE_GROUPS,
  type StapleGroup,
} from "./packs.js";
export { createPantry, type KitchenItem, type NewItem } from "./pantry.js";
export { createPlans, type PlannedMeal } from "./plans.js";
export { createShopping, type ListItem } from "./shopping.js";
export {
  type Clearable,
  memoryRecordStore,
  type RecordStore,
} from "./record-store.js";
export { type Cook, type PlanSent, type SignedIn } from "./settings-cook.js";
export {
  createSaveProblems,
  type SaveProblem,
  type SaveProblems,
  watchSaves,
} from "./saves.js";
export { type SyncRecord } from "./records.js";
// The sync engine's code is "@cookto/data/sync", its own entry, loaded only
// when a phone that signed in syncs (specs/217). Its types are here.
export type { Sync, SyncOptions, SyncOutcome } from "./sync.js";
export { SYNC_TOPICS } from "./sync-topics.js";
// The household's settings record is "@cookto/data/household-settings", its
// own entry, loaded once a phone signs in (specs/240).
export type { Schedule } from "./schedule.js";
export {
  BEANS,
  ROLES,
  type Role,
  type Beans,
  createSettings,
  THEMES,
  type Theme,
} from "./settings.js";
