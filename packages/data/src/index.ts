// Data (ADR 0022, 0024): repositories, the store, and how data is stored,
// cached and synced. Screen hooks read through ./read; only use cases import
// ./write. The app creates them here, handing in the browser's storage.
export { createChanges, type Changes } from "./changes.js";
export { createCooked, type Cooked } from "./cooked.js";
export { createHousehold } from "./household.js";
export { memoryKeyValue, type KeyValue } from "./kv.js";
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
export { memoryRecordStore, type RecordStore } from "./record-store.js";
export { type SyncRecord } from "./records.js";
export {
  BEANS,
  type Beans,
  createSettings,
  THEMES,
  type Theme,
} from "./settings.js";
