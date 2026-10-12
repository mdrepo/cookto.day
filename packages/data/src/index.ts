// Data (ADR 0022, 0024): repositories, the store, and how data is stored,
// cached and synced. Screen hooks read through ./read; only use cases import
// ./write. The app creates them here, handing in the browser's storage.
export { memoryKeyValue, type KeyValue } from "./kv.js";
export { createSettings } from "./settings.js";
