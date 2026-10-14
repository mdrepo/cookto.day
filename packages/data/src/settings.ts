import { createStore, type StoreApi } from "zustand/vanilla";
import type { KeyValue } from "./kv.js";

// App-wide settings (ADR 0023): one Zustand store, read by screen hooks
// through selectors, and written only by use cases (ADR 0022).

/** Light, dark, or whatever the phone is set to (specs/96). */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export interface Settings {
  language: string;
  theme: Theme;
  /** Where the household lives: its currency and shops (ADR 0026). */
  country: string;
  /** Whether onboarding is done or skipped: it's asked once (specs/65). */
  onboarded: boolean;
  /** The cuisines loaded, what the household doesn't make, and the sample. */
  kitchen: KitchenSettings;
}

/** Choices that filter what loaded packs offer (ADR 0027). */
export interface KitchenSettings {
  cuisines: string[];
  /** Parts or ingredients the household doesn't make ("roti"). */
  skip: string[];
  /** A sample kitchen is in; it loaded these cuisines itself. */
  sample: { addedCuisines: string[] } | null;
}

const NO_KITCHEN: KitchenSettings = { cuisines: [], skip: [], sample: null };

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
  setOnboarded(): void;
}

/** The theme (specs/96), for its use case only. */
export interface ThemeWriter {
  setTheme(theme: Theme): void;
}

/** The kitchen's settings, for the kitchen's use cases only. */
export interface KitchenSettingsWriter {
  kitchen(): KitchenSettings;
  setKitchen(kitchen: KitchenSettings): void;
}

/** The key is today's, so people keep the language they chose. */
const LANGUAGE = "cookto.day:language";
const COUNTRY = "cookto.day:country";
const THEME = "cookto.day:theme";
const ONBOARDED = "cookto.day:onboarded";
const KITCHEN = "cookto.day:kitchen";

const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

/** The saved kitchen, or none when it's missing or not what we saved. */
function readKitchen(text: string | null): KitchenSettings {
  try {
    const v = JSON.parse(text ?? "null") as Partial<KitchenSettings> | null;
    const sample = v?.sample ?? null;
    if (
      v &&
      strings(v.cuisines) &&
      strings(v.skip) &&
      (sample === null || strings(sample.addedCuisines))
    )
      return { cuisines: v.cuisines, skip: v.skip, sample };
  } catch {
    // not JSON
  }
  return NO_KITCHEN;
}

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
): {
  store: SettingsStore;
  writer: SettingsWriter & KitchenSettingsWriter & ThemeWriter;
} {
  const speaks = (language: string) => options.languages.includes(language);
  const knowsCountry = (country: string) => options.countries.includes(country);
  const { preview = null, previews = [] } = options;
  const saved = read(kv, LANGUAGE);
  const savedCountry = read(kv, COUNTRY);
  const savedTheme = read(kv, THEME);
  const store = createStore<Settings>(() => ({
    language:
      preview !== null && (speaks(preview) || previews.includes(preview))
        ? preview
        : saved !== null && speaks(saved)
          ? saved
          : options.fallback,
    theme: THEMES.find((t) => t === savedTheme) ?? "system",
    country:
      savedCountry !== null && knowsCountry(savedCountry)
        ? savedCountry
        : options.fallbackCountry,
    onboarded: read(kv, ONBOARDED) === "yes",
    kitchen: readKitchen(read(kv, KITCHEN)),
  }));
  return {
    store,
    writer: {
      speaks,
      setLanguage(language) {
        store.setState({ language });
        write(kv, LANGUAGE, language);
      },
      setTheme(theme) {
        store.setState({ theme });
        write(kv, THEME, theme);
      },
      knowsCountry,
      setCountry(country) {
        store.setState({ country });
        write(kv, COUNTRY, country);
      },
      setOnboarded() {
        store.setState({ onboarded: true });
        write(kv, ONBOARDED, "yes");
      },
      kitchen: () => store.getState().kitchen,
      setKitchen(kitchen) {
        store.setState({ kitchen });
        write(kv, KITCHEN, JSON.stringify(kitchen));
      },
    },
  };
}
