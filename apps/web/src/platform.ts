import { createSettings, memoryKeyValue, type KeyValue } from "@cookto/data";
import { LOCALES } from "./i18n/index.js";

// The one file that hands the browser's storage to the data layer (ADR 0024,
// specs/51-settings.md). Everything else reads and writes through @cookto/data.

/** The browser's localStorage, or memory where there is none (the prerender). */
function browserKeyValue(): KeyValue {
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
    // Some private modes throw on access: memory it is.
  }
  return memoryKeyValue();
}

export const settings = createSettings(browserKeyValue(), {
  languages: Object.keys(LOCALES),
  fallback: "en",
});
