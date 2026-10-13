// A pack as the app loads it (ADR 0015, 0027): one small file per pack,
// written by `bun run packs:bundle` into packages/data/src/packs/ and loaded
// only when a household picks its cuisine. Ingredients are Wikidata ids, as
// the pantry keys them. Sources, labels and amounts stay in the pack: the
// app doesn't use them yet, and they'd only add weight.
import { type Pack, STAPLE_GROUPS } from "./packs-lib.js";

type Group = (typeof STAPLE_GROUPS)[number];

export interface AppPack {
  id: string;
  dishes: {
    id: string;
    slots: string[];
    ingredients: string[];
    servedWith?: string[];
  }[];
  /** Fresh food: Wikidata id to the days it keeps. */
  fresh: Record<string, number>;
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
      ...(dish.servedWith ? { servedWith: dish.servedWith } : {}),
    })),
    fresh: Object.fromEntries(
      Object.values(pack.ingredients).flatMap((i) =>
        i.keeps ? [[i.wikidata, i.keeps.days]] : [],
      ),
    ),
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
