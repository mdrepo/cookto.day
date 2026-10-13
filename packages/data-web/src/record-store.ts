import { memoryRecordStore, type RecordStore } from "@cookto/data";
import { indexedDbRecordStore } from "./indexeddb.js";

/**
 * The browser's record store: IndexedDB, or memory where there is none (the
 * prerender, tests), so the app still draws.
 */
export function browserRecordStore(name: string): RecordStore {
  return typeof indexedDB === "undefined"
    ? memoryRecordStore()
    : indexedDbRecordStore(name);
}
