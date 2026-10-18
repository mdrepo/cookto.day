// A pack as the app loads it (ADR 0015, 0027): one small file per pack,
// written by `bun run packs:bundle` into packages/data/src/packs/ and loaded
// only when a household picks its cuisine. Ingredients are Wikidata ids, as
// the pantry keys them. A dish keeps its amounts for one person and its
// source, for its page (specs/95); labels stay in the pack.
import { type Pack, STAPLE_GROUPS } from "./packs-lib.js";

type Group = (typeof STAPLE_GROUPS)[number];

export interface AppPack {
  id: string;
  dishes: {
    id: string;
    slots: string[];
    ingredients: string[];
    /** For one person, in the same order as `ingredients`. */
    amounts: [number, string][];
    servedWith?: string[];
    /** Where the recipe is: the app links to it, it doesn't copy it. */
    source: string;
    /** Its photo's credit (specs/118); the files come in their own module. */
    photo?: { author: string; licence: string; source: string };
  }[];
  /** Fresh food: Wikidata id to the days it keeps. */
  fresh: Record<string, number>;
  /** Food also bought frozen: Wikidata id to the days it keeps frozen. */
  frozen?: Record<string, number>;
  staples: Record<Group, string[]>;
  sample: { ingredient: string; amount?: number; unit?: string }[];
  words: Record<
    string,
    {
      dishes: Record<string, string>;
      ingredients: Record<string, string>;
      parts: Record<string, string>;
    }
  >;
}

/** Food also bought frozen, and its days frozen (specs/149), if any. */
function frozenOf(pack: Pack): { frozen?: Record<string, number> } {
  const frozen = Object.values(pack.ingredients).flatMap((i) =>
    i.freezes ? [[i.wikidata, i.freezes.days] as const] : [],
  );
  return frozen.length > 0 ? { frozen: Object.fromEntries(frozen) } : {};
}

export function bundlePack(pack: Pack): AppPack {
  const q = (slug: string) => pack.ingredients[slug]?.wikidata ?? slug;
  const byId = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).map(([k, v]) => [q(k), v]));
  return {
    id: pack.id,
    dishes: Object.entries(pack.dishes).map(([id, dish]) => ({
      id,
      slots: dish.slots,
      ingredients: Object.keys(dish.ingredients).map(q),
      amounts: Object.values(dish.ingredients).map((i): [number, string] => [
        i.amount,
        i.unit,
      ]),
      ...(dish.servedWith ? { servedWith: dish.servedWith } : {}),
      source: dish.source,
      ...(dish.photo ? { photo: dish.photo } : {}),
    })),
    fresh: Object.fromEntries(
      Object.values(pack.ingredients).flatMap((i) =>
        i.keeps ? [[i.wikidata, i.keeps.days]] : [],
      ),
    ),
    ...frozenOf(pack),
    staples: Object.fromEntries(
      STAPLE_GROUPS.map((g) => [g, pack.staples[g].map(q)]),
    ) as Record<Group, string[]>,
    sample: (pack.sample ?? []).map((s) => ({
      ...s,
      ingredient: q(s.ingredient),
    })),
    words: Object.fromEntries(
      Object.entries(pack.words).map(([lang, w]) => [
        lang,
        { dishes: w.dishes, ingredients: byId(w.ingredients), parts: w.parts },
      ]),
    ),
  };
}
