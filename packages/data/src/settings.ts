import { createStore, type StoreApi } from "zustand/vanilla";
import type { KeyValue } from "./kv.js";
import { SCHEDULE_KEY, type Schedule, startSchedule } from "./schedule.js";
import {
  type Cook,
  type CookWriter,
  readCook,
  readSignedIn,
  type SignedIn,
  type SignInWriter,
} from "./settings-cook.js";

// App-wide settings (ADR 0023): one Zustand store, read by screen hooks
// through selectors, and written only by use cases (ADR 0022).

/** Light, dark, or whatever the phone is set to (specs/96). */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Dried beans need soaking the night before; tinned don't (specs/144). */
export const BEANS = ["dried", "tinned"] as const;
export type Beans = (typeof BEANS)[number];

/** Who this phone is for (specs/195): the cook, or whoever plans the meals. */
export const ROLES = ["cook", "plan"] as const;
export type Role = (typeof ROLES)[number];

/** The schedule's three (specs/240) are with the rest, in ./schedule. */
export interface Settings extends Schedule {
  language: string;
  theme: Theme;
  beans: Beans;
  /** The cook's phone, or the planner's (specs/195); the cook to start. */
  role: Role;
  /** The day whose plan was approved with "Looks good", "YYYY-MM-DD". */
  sorted: string | null;
  /** The cook's Telegram, once connected, and what went to her (specs/207). */
  cook: Cook | null;
  /** Signed in with Telegram (specs/216), or not. */
  signedIn: SignedIn | null;
  /** Where the household lives: its currency and shops (ADR 0026). */
  country: string;
  /** Whether onboarding is done or skipped: it's asked once (specs/65). */
  onboarded: boolean;
  /** Read that a receipt photo goes to Gemini, on this phone (specs/129). */
  receiptsAgreed: boolean;
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

/** "Read it", the first time (specs/129): not asked again on this phone. */
export interface ReceiptsAgreedWriter {
  agreeToReceipts(): void;
}

/** The theme (specs/96), for its use case only. */
export interface ThemeWriter {
  setTheme(theme: Theme): void;
}

/** Who cooks, and tomorrow approved (specs/195), for their use cases only. */
export interface WhoCooksWriter {
  setRole(role: Role): void;
  setSorted(on: string): void;
}

/** Dried or tinned beans (specs/144), for its use case only. */
export interface BeansWriter {
  setBeans(beans: Beans): void;
}

/** The kitchen's settings, for the kitchen's use cases only. */
export interface KitchenSettingsWriter {
  kitchen(): KitchenSettings;
  setKitchen(kitchen: KitchenSettings): void;
  /** Pack moves this household has had, done once each (specs/147). */
  moves(): string[];
  setMoves(moves: string[]): void;
}

/** The key is today's, so people keep the language they chose. */
const LANGUAGE = "cookto.day:language";
const COUNTRY = "cookto.day:country";
const THEME = "cookto.day:theme";
const BEANS_KEY = "cookto.day:beans";
const ROLE_KEY = "cookto.day:role";
const SORTED_KEY = "cookto.day:sorted";
const ONBOARDED = "cookto.day:onboarded";
const RECEIPTS_AGREED = "cookto.day:receiptsAgreed";
const KITCHEN = "cookto.day:kitchen";
const SIGNED_IN_KEY = "cookto.day:signedIn";
const MOVES = "cookto.day:moves";
const COOK_KEY = "cookto.day:cook";

const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

/** The saved kitchen, or none when it's missing or not what we saved. */
export function readKitchen(text: string | null): KitchenSettings {
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

/** The pack moves saved, or none when missing or not what we saved. */
function readMoves(text: string | null): string[] {
  try {
    const v: unknown = JSON.parse(text ?? "[]");
    return strings(v) ? v : [];
  } catch {
    return [];
  }
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

interface SettingsOptions {
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
}

/** What's saved, where it still makes sense; else each setting's start. */
function startingState(
  kv: KeyValue,
  options: SettingsOptions,
  speaks: (language: string) => boolean,
  knowsCountry: (country: string) => boolean,
): Settings {
  const { preview = null, previews = [] } = options;
  const saved = read(kv, LANGUAGE);
  const savedCountry = read(kv, COUNTRY);
  const savedTheme = read(kv, THEME);
  const savedBeans = read(kv, BEANS_KEY);
  const savedRole = read(kv, ROLE_KEY);
  return {
    language:
      preview !== null && (speaks(preview) || previews.includes(preview))
        ? preview
        : saved !== null && speaks(saved)
          ? saved
          : options.fallback,
    theme: THEMES.find((t) => t === savedTheme) ?? "system",
    beans: BEANS.find((b) => b === savedBeans) ?? "dried",
    role: ROLES.find((r) => r === savedRole) ?? "cook",
    sorted: read(kv, SORTED_KEY),
    cook: readCook(read(kv, COOK_KEY)),
    signedIn: readSignedIn(read(kv, SIGNED_IN_KEY)),
    country:
      savedCountry !== null && knowsCountry(savedCountry)
        ? savedCountry
        : options.fallbackCountry,
    onboarded: read(kv, ONBOARDED) === "yes",
    receiptsAgreed: read(kv, RECEIPTS_AGREED) === "yes",
    kitchen: readKitchen(read(kv, KITCHEN)),
    ...startSchedule(read(kv, SCHEDULE_KEY)),
  };
}

export function createSettings(
  kv: KeyValue,
  options: SettingsOptions,
): {
  store: SettingsStore;
  writer: SettingsWriter &
    KitchenSettingsWriter &
    ThemeWriter &
    BeansWriter &
    WhoCooksWriter &
    CookWriter &
    SignInWriter &
    ReceiptsAgreedWriter;
} {
  const speaks = (language: string) => options.languages.includes(language);
  const knowsCountry = (country: string) => options.countries.includes(country);
  const store = createStore<Settings>(() =>
    startingState(kv, options, speaks, knowsCountry),
  );
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
      setBeans(beans) {
        store.setState({ beans });
        write(kv, BEANS_KEY, beans);
      },
      setRole(role) {
        store.setState({ role });
        write(kv, ROLE_KEY, role);
      },
      setSorted(on) {
        store.setState({ sorted: on });
        write(kv, SORTED_KEY, on);
      },
      cook: () => store.getState().cook,
      setCook(cook) {
        store.setState({ cook });
        write(kv, COOK_KEY, JSON.stringify(cook));
      },
      setSignedIn(signedIn) {
        store.setState({ signedIn });
        write(kv, SIGNED_IN_KEY, JSON.stringify(signedIn));
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
      agreeToReceipts() {
        store.setState({ receiptsAgreed: true });
        write(kv, RECEIPTS_AGREED, "yes");
      },
      kitchen: () => store.getState().kitchen,
      moves: () => readMoves(read(kv, MOVES)),
      setMoves(moves) {
        write(kv, MOVES, JSON.stringify(moves));
      },
      setKitchen(kitchen) {
        store.setState({ kitchen });
        write(kv, KITCHEN, JSON.stringify(kitchen));
      },
    },
  };
}
