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

export interface DishPhoto {
  author: string;
  licence: string;
  /** Its page on Wikimedia Commons, where its licence is. */
  source: string;
  /** 800 by 600 at most, and 160 by 160. */
  large: string;
  small: string;
}

export interface AppPack {
  id: string;
  dishes: {
    id: string;
    slots: MealSlot[];
    /** Wikidata ids, as the pantry keys them. */
    ingredients: string[];
    /**
     * For one person, in the same order as `ingredients` (specs/95). Every
     * bundled pack has them; a test's dish may not.
     */
    amounts?: [number, "g" | "ml" | "pieces"][];
    servedWith?: string[];
    /** Where the recipe is: the app links to it, it doesn't copy it. */
    source?: string;
    /** A free photo of it, credited, and the addresses of its files (specs/118). */
    photo?: DishPhoto;
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

type Photos = Record<string, readonly [string, string]>;

/** A pack's file, and its photos' addresses (specs/118). */
const LOADERS: Record<
  string,
  () => Promise<[{ default: string }, { default: Photos }]>
> = {
  "north-indian": () =>
    Promise.all([
      import("./packs/north-indian.js"),
      import("./packs/north-indian.photos.js"),
    ]),
};

/** Each credited dish gets its photo's files. */
function withPhotos(pack: AppPack, photos: Photos): AppPack {
  for (const dish of pack.dishes) {
    const files = photos[dish.id];
    if (dish.photo && files) [dish.photo.large, dish.photo.small] = files;
    else delete dish.photo;
  }
  return pack;
}

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
      const [pack, photos] = await loader();
      return withPhotos(JSON.parse(pack.default) as AppPack, photos.default);
    },
  };
}
