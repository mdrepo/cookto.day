import type { MealSlot } from "@cookto/engine";
import catalog from "./packs/catalog.js";

// Cuisine packs, as the app loads them (ADR 0015, 0027): written from packs/
// by `bun run packs:bundle`. A pack's file loads only when a household picks
// its cuisine, so it never weighs on the first page.

export const STAPLE_GROUPS = ["grains-and-dals", "spices", "basics"] as const;
export type StapleGroup = (typeof STAPLE_GROUPS)[number];

export interface PackWords {
  dishes: Record<string, string>;
  /** By Wikidata id. */
  ingredients: Record<string, string>;
  parts: Record<string, string>;
}

export interface AppPack {
  id: string;
  dishes: {
    id: string;
    slots: MealSlot[];
    /** Wikidata ids, as the pantry keys them. */
    ingredients: string[];
    servedWith?: string[];
  }[];
  /** Fresh food: Wikidata id to the days it keeps. */
  fresh: Record<string, number>;
  staples: Record<StapleGroup, string[]>;
  sample: {
    ingredient: string;
    amount?: number;
    unit?: "g" | "ml" | "pieces";
  }[];
  words: Record<string, PackWords | undefined>;
}

export interface Cuisine {
  id: string;
  dishes: number;
  /** Coming soon: it needs a pack, and a cook to review it. */
  soon: boolean;
}

export interface PackLoader {
  cuisines(): Cuisine[];
  load(id: string): Promise<AppPack>;
}

/** Every cuisine people see, in this order; only the ones with a pack open. */
const CUISINES = ["north-indian", "south-indian", "european", "sri-lankan"];

const LOADERS: Record<string, () => Promise<{ default: string }>> = {
  "north-indian": () => import("./packs/north-indian.js"),
};

export function createPacks(): PackLoader {
  const dishes = JSON.parse(catalog) as Record<string, number>;
  return {
    cuisines: () =>
      CUISINES.map((id) => ({
        id,
        dishes: dishes[id] ?? 0,
        soon: !(id in LOADERS),
      })),
    async load(id) {
      const loader = LOADERS[id];
      if (!loader) throw new Error(`No pack "${id}" to load yet.`);
      return JSON.parse((await loader()).default) as AppPack;
    },
  };
}
