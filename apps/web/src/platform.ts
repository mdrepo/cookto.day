import {
  createChanges,
  createCooked,
  createSaveProblems,
  createHousehold,
  createPacks,
  createPantry,
  createPlans,
  createSettings,
  createShopping,
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

const records = watchSaves(
  browserRecordStore("cookto.day"),
  saveProblems.report,
);

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
