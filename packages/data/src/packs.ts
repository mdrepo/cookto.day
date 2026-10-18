import type { MealSlot, Prep } from "@cookto/engine";
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
    /** What to do hours before, its food by Wikidata id (specs/144). */
    prep?: Prep[];
    /** A dish of the child's own (specs/145). */
    for?: "child"[];
    /** Its optional extras: Wikidata id and the amount for one child. */
    addIns?: [string, number, "g" | "ml" | "pieces"][];
    /** Small round fruit: a toddler has it cut in half. */
    cut?: boolean;
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
  /** Each dish's steps, by dish id: loaded when a dish opens (specs/149). */
  steps(id: string): Promise<Record<string, string[]>>;
}

/** Every cuisine people see, in this order; only the ones with a pack open. */
const CUISINES = [
  "north-indian",
  "maharashtrian",
  "our-kitchen",
  "south-indian",
  "european",
  "sri-lankan",
];

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
  maharashtrian: () =>
    Promise.all([
      import("./packs/maharashtrian.js"),
      import("./packs/maharashtrian.photos.js"),
    ]),
  // No photos yet: the family's own dishes.
  "our-kitchen": async () => [
    await import("./packs/our-kitchen.js"),
    { default: {} },
  ],
};

/** A pack's steps: their own file, so Today never waits for them (#149). */
const STEPS: Record<string, () => Promise<{ default: string }>> = {
  "north-indian": () => import("./packs/north-indian.steps.js"),
  maharashtrian: () => import("./packs/maharashtrian.steps.js"),
  "our-kitchen": () => import("./packs/our-kitchen.steps.js"),
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
    async steps(id) {
      const loader = STEPS[id];
      if (!loader) throw new Error(`No pack "${id}" to load yet.`);
      const file = await loader();
      return JSON.parse(file.default) as Record<string, string[]>;
    },
  };
}
