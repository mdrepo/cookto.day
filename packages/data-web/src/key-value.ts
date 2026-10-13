import { type KeyValue, memoryKeyValue } from "@cookto/data";

/**
 * The browser's localStorage as a key-value store, for the few settings that
 * must be ready before the first draw; memory where there is none (the
 * prerender) or it's switched off (some private modes throw on access).
 */
export function browserKeyValue(): KeyValue {
  try {
    const storage = globalThis.localStorage as Storage | undefined;
    if (storage)
      return {
        get: (key) => storage.getItem(key),
        set: (key, value) => {
          storage.setItem(key, value);
        },
      };
  } catch {
    // Storage is off: memory it is.
  }
  return memoryKeyValue();
}
