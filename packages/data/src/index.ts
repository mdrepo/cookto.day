// Data (ADR 0022, 0024): repositories, the store, and how data is stored,
// cached and synced. Screen hooks read through ./read; only use cases import
// ./write. The app creates them here, handing in the browser's storage.
export { createChanges, type Changes } from "./changes.js";
export { createHousehold } from "./household.js";
export { memoryKeyValue, type KeyValue } from "./kv.js";
export { memoryRecordStore, type RecordStore } from "./record-store.js";
export { type SyncRecord } from "./records.js";
export { createSettings } from "./settings.js";
