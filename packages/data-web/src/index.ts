// The browser's storage for @cookto/data (ADR 0024): IndexedDB for records,
// localStorage for the few settings needed before the first draw. The web app
// hands these to @cookto/data in apps/web/src/platform.ts.
export { indexedDbRecordStore } from "./indexeddb.js";
export { browserKeyValue } from "./key-value.js";
export { browserRecordStore } from "./record-store.js";
