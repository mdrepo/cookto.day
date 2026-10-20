import {
  createChanges,
  createCooked,
  createSaveProblems,
  createHousehold,
  createMyDishes,
  createPacks,
  createPantry,
  createPlans,
  createSettings,
  createShopping,
  type Sync,
  watchSaves,
} from "@cookto/data";
import { browserKeyValue, browserRecordStore } from "@cookto/data-web";
import { openCountries } from "@cookto/engine";
import { queryOptions } from "@tanstack/react-query";
import { LOCALES } from "./i18n/index.js";
import { createQueries } from "./queries.js";

// The one file that hands the browser's storage (@cookto/data-web) and
// address to the data layer (ADR 0024). Everything else reads and writes
// through @cookto/data.

/**
 * Our own API, on this page's origin (ADR 0025): the cook's link (#207).
 * Loaded when first needed, so a phone without a cook never fetches it.
 */
export const api = () =>
  import("@cookto/data/network").then((m) => m.createApi());

/** ?preview-language=ar: a reviewer's look at a language that's coming soon. */
function previewLanguage(): string | null {
  if (typeof location === "undefined") return null; // the prerender
  return new URLSearchParams(location.search).get("preview-language");
}

export const settings = createSettings(browserKeyValue(), {
  languages: Object.entries(LOCALES)
    .filter(([, locale]) => !locale.soon)
    .map(([code]) => code),
  fallback: "en",
  previews: Object.keys(LOCALES),
  preview: previewLanguage(),
  countries: openCountries(),
  fallbackCountry: "SG",
});

/** What repositories announce, and the queries it refreshes (ADR 0024). */
const changes = createChanges();
export const queries = createQueries(changes);

/** The last failed save, for the note on any screen (specs/138). */
export const saveProblems = createSaveProblems();

const saved = watchSaves(browserRecordStore("cookto.day"), saveProblems.report);

/**
 * Sync (specs/217): signed in, every save through `records` is pending
 * until pushed, and a push follows after a short pause. The engine and the
 * API's code load when first needed, so a phone that never signs in never
 * fetches them.
 */
let engine: Promise<Sync> | null = null;
export const sync = () =>
  (engine ??= import("@cookto/data/sync").then((m) =>
    m.createSync({
      store: saved,
      api: {
        push: (pushed) => api().then((a) => a.push(pushed)),
        changes: (after) => api().then((a) => a.changes(after)),
      },
      kv: browserKeyValue(),
      changes,
    }),
  ));
const signedIn = () => settings.store.getState().signedIn !== null;
const records = {
  ...saved,
  put: async (collection: string, list: readonly { id: string }[]) => {
    if (!signedIn()) return saved.put(collection, list);
    const s = await sync();
    await s.store.put(collection, list);
    s.soon();
  },
};

/** What the household's use cases need (specs/217). */
export const householdSync = async () => ({
  api: await api(),
  store: saved,
  sync: await sync(),
  settings: settings.writer,
  changes,
});

export const household = createHousehold(records, { changes });

/** Everyone in the household. Hooks narrow it with `select`. */
export const membersQuery = queryOptions({
  queryKey: ["household", "members"],
  queryFn: ({ signal }) => household.reader.members(signal),
});

/** The pantry, and the cuisine packs a household loads (ADR 0027). */
export const pantry = createPantry(records, { changes });
export const packs = createPacks();
/** The shopping list (specs/103). */
export const shopping = createShopping(records, { changes });

/** What the kitchen's use cases need. */
export const kitchen = { pantry, settings: settings.writer, packs, shopping };

/** What's on the shopping list. Hooks narrow it with `select`. */
export const shoppingQuery = queryOptions({
  queryKey: ["shopping", "items"],
  queryFn: ({ signal }) => shopping.reader.items(signal),
});

/** What was cooked, and when (specs/104). */
export const cooked = createCooked(records, { changes });

/** Everything cooked. Hooks narrow it with `select`. */
export const cookedQuery = queryOptions({
  queryKey: ["cooked", "all"],
  queryFn: ({ signal }) => cooked.reader.all(signal),
});

/** My dishes: the dishes taken out of them are saved (specs/175). */
export const myDishes = createMyDishes(records, { changes });

/** The dishes taken out of My dishes. */
export const takenOutQuery = queryOptions({
  queryKey: ["my-dishes", "taken-out"],
  queryFn: ({ signal }) => myDishes.reader.takenOut(signal),
});

/** Meals planned the evening before, and their prep (specs/144). */
export const plans = createPlans(records, { changes });

/** Every planned meal. Hooks narrow it with `select`. */
export const plansQuery = queryOptions({
  queryKey: ["plans", "all"],
  queryFn: ({ signal }) => plans.reader.all(signal),
});

/** Everything in the pantry. Hooks narrow it with `select`. */
export const pantryQuery = queryOptions({
  queryKey: ["pantry", "items"],
  queryFn: ({ signal }) => pantry.reader.items(signal),
});

/** A loaded cuisine's pack: read once, it never changes while the app runs. */
export const packQuery = (id: string) =>
  queryOptions({
    queryKey: ["packs", id],
    queryFn: () => packs.load(id),
  });

/** "21:00" as people say it: "9 pm" (specs/144). */
export function timeOfDay(hhmm: string, locale: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    ...(m === 0 ? {} : { minute: "2-digit" }),
  }).format(new Date(2000, 0, 1, h, m));
}

/** This moment, for showing the date: the app's one clock. */
export function now(): Date {
  return new Date();
}

/** A pack's steps, by dish: loaded when a dish opens, read once (#149). */
export const stepsQuery = (id: string) =>
  queryOptions({
    queryKey: ["packs", id, "steps"],
    queryFn: () => packs.steps(id),
  });

const two = (n: number) => String(n).padStart(2, "0");

/** Today in the household's own calendar, "YYYY-MM-DD". */
export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** The household's time now, "YYYY-MM-DDTHH:MM" (specs/144). */
export function clock(): string {
  const now = new Date();
  return `${today()}T${two(now.getHours())}:${two(now.getMinutes())}`;
}

/** Whether the address asks for a sample kitchen: "?sample". */
export function sampleAsked(): boolean {
  if (typeof location === "undefined") return false; // the prerender
  return new URLSearchParams(location.search).has("sample");
}
