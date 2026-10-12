import { createStore, type StoreApi } from "zustand/vanilla";
import type { KeyValue } from "./kv.js";

// App-wide settings (ADR 0023): one Zustand store, read by screen hooks
// through selectors, and written only by use cases (ADR 0022).

export interface Settings {
  language: string;
}

/** What screen hooks read. */
export type SettingsStore = StoreApi<Settings>;

/** What only use cases may call. */
export interface SettingsWriter {
  /** Whether the app speaks this language. */
  speaks(language: string): boolean;
  setLanguage(language: string): void;
}

/** The key is today's, so people keep the language they chose. */
const LANGUAGE = "cookto.day:language";

/** Reads `key`, or null when storage is off (some private modes throw). */
function read(kv: KeyValue, key: string): string | null {
  try {
    return kv.get(key);
  } catch {
    return null;
  }
}

export function createSettings(
  kv: KeyValue,
  options: { languages: readonly string[]; fallback: string },
): { store: SettingsStore; writer: SettingsWriter } {
  const speaks = (language: string) => options.languages.includes(language);
  const saved = read(kv, LANGUAGE);
  const store = createStore<Settings>(() => ({
    language: saved !== null && speaks(saved) ? saved : options.fallback,
  }));
  return {
    store,
    writer: {
      speaks,
      setLanguage(language) {
        store.setState({ language });
        try {
          kv.set(LANGUAGE, language);
        } catch {
          // Not remembered, but the page still switches.
        }
      },
    },
  };
}
