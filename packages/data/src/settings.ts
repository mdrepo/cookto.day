import { createStore, type StoreApi } from "zustand/vanilla";
import type { KeyValue } from "./kv.js";

// App-wide settings (ADR 0023): one Zustand store, read by screen hooks
// through selectors, and written only by use cases (ADR 0022).

export interface Settings {
  language: string;
  /** Where the household lives: its currency and shops (ADR 0026). */
  country: string;
}

/** What screen hooks read. */
export type SettingsStore = StoreApi<Settings>;

/** What only use cases may call. */
export interface SettingsWriter {
  /** Whether the app speaks this language. */
  speaks(language: string): boolean;
  setLanguage(language: string): void;
  /** Whether people can choose this country yet. */
  knowsCountry(country: string): boolean;
  setCountry(country: string): void;
}

/** The key is today's, so people keep the language they chose. */
const LANGUAGE = "cookto.day:language";
const COUNTRY = "cookto.day:country";

/** Reads `key`, or null when storage is off (some private modes throw). */
function read(kv: KeyValue, key: string): string | null {
  try {
    return kv.get(key);
  } catch {
    return null;
  }
}

/** Saves `value`, if storage lets us: the store has changed either way. */
function write(kv: KeyValue, key: string, value: string): void {
  try {
    kv.set(key, value);
  } catch {
    // Not remembered, but the page still switches.
  }
}

export function createSettings(
  kv: KeyValue,
  options: {
    /** The languages people can choose. */
    languages: readonly string[];
    fallback: string;
    /** Languages a reviewer may see before people can choose them. */
    previews?: readonly string[];
    /** The language a reviewer asked to see. Shown, never saved. */
    preview?: string | null;
    /** The countries people can choose. */
    countries: readonly string[];
    fallbackCountry: string;
  },
): { store: SettingsStore; writer: SettingsWriter } {
  const speaks = (language: string) => options.languages.includes(language);
  const knowsCountry = (country: string) => options.countries.includes(country);
  const { preview = null, previews = [] } = options;
  const saved = read(kv, LANGUAGE);
  const savedCountry = read(kv, COUNTRY);
  const store = createStore<Settings>(() => ({
    language:
      preview !== null && (speaks(preview) || previews.includes(preview))
        ? preview
        : saved !== null && speaks(saved)
          ? saved
          : options.fallback,
    country:
      savedCountry !== null && knowsCountry(savedCountry)
        ? savedCountry
        : options.fallbackCountry,
  }));
  return {
    store,
    writer: {
      speaks,
      setLanguage(language) {
        store.setState({ language });
        write(kv, LANGUAGE, language);
      },
      knowsCountry,
      setCountry(country) {
        store.setState({ country });
        write(kv, COUNTRY, country);
      },
    },
  };
}
