import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
  Ingredient,
  Pack,
  SampleItem,
  Sources,
  Words,
} from "./packs-lib.js";

// Reads packs and their stored sources from disk: packs/<id>/ holds
// pack.json, staples.json, dishes/<slug>.json and words/<lang>.json (its
// dishes' and parts' words) (ADR 0015, 0027), and photos/<dish>.webp with
// its .small.webp (specs/118). Food lives once, in packs/ingredients/<slug>
// .json, with its names in every language, shared by every pack (specs/148).

export const PACKS = "packs";
export const SOURCES = join(PACKS, "sources");
export const INGREDIENTS = join(PACKS, "ingredients");

/** A food, once for every pack, with what people call it (specs/148). */
interface Food extends Ingredient {
  names: { text: string; lang: string }[];
}

const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

function folder(dir: string): Record<string, never> {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => [f.slice(0, -5), json(join(dir, f))]),
  ) as Record<string, never>;
}

/** Each dish's photo files, by size in bytes (specs/118). */
function photos(dir: string): NonNullable<Pack["photos"]> {
  if (!existsSync(dir)) return {};
  const size = (f: string) =>
    existsSync(join(dir, f)) ? statSync(join(dir, f)).size : Infinity;
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".webp") && !f.endsWith(".small.webp"))
      .sort()
      .map((f) => {
        const slug = f.slice(0, -5);
        return [slug, { large: size(f), small: size(`${slug}.small.webp`) }];
      }),
  );
}

/** Every food a pack's dishes, staples and sample use. */
function usedBy(pack: Omit<Pack, "ingredients">): Set<string> {
  return new Set([
    ...Object.values(pack.dishes).flatMap((d) => Object.keys(d.ingredients)),
    ...Object.values(pack.staples).flat(),
    ...(pack.sample ?? []).map((s) => s.ingredient),
  ]);
}

/**
 * A pack with its share of the foods: their records, and in each of its
 * languages, each food's first name in that language.
 */
function withFoods(
  pack: Omit<Pack, "ingredients">,
  foods: Record<string, Food>,
): Pack {
  const used = [...usedBy(pack)].filter((s) => s in foods).sort();
  const ingredients = Object.fromEntries(
    used.map((slug) => {
      const { wikidata, label, keeps, freezes } = foods[slug] as Food;
      return [
        slug,
        {
          wikidata,
          label,
          ...(keeps ? { keeps } : {}),
          ...(freezes ? { freezes } : {}),
        },
      ];
    }),
  );
  const words = Object.fromEntries(
    Object.entries(pack.words).map(([lang, w]) => {
      const names = used.flatMap((slug): [string, string][] => {
        const name = foods[slug]?.names.find((n) => n.lang === lang);
        return name ? [[slug, name.text]] : [];
      });
      const own = w as Omit<Words, "ingredients">;
      return [lang, { ...own, ingredients: Object.fromEntries(names) }];
    }),
  );
  return { ...pack, ingredients, words };
}

export function readPacks(): Pack[] {
  if (!existsSync(PACKS)) return [];
  const foods = folder(INGREDIENTS) as Record<string, Food>;
  return readdirSync(PACKS, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && d.name !== "sources" && d.name !== "ingredients",
    )
    .map((d) => {
      const dir = join(PACKS, d.name);
      const meta = json(join(dir, "pack.json")) as Pick<
        Pack,
        "languages" | "parts"
      >;
      return withFoods(
        {
          id: d.name,
          ...meta,
          staples: json(join(dir, "staples.json")) as Pack["staples"],
          dishes: folder(join(dir, "dishes")),
          words: folder(join(dir, "words")),
          photos: photos(join(dir, "photos")),
          ...(existsSync(join(dir, "sample.json"))
            ? { sample: json(join(dir, "sample.json")) as SampleItem[] }
            : {}),
        },
        foods,
      );
    });
}

export function readSources(): Sources {
  const read = (name: string) => {
    const path = join(SOURCES, name);
    return existsSync(path) ? (json(path) as Record<string, never>) : {};
  };
  // Approved specs: merged ones are on main, as specs/<n>-<name>.md.
  const specs = existsSync("specs")
    ? readdirSync("specs").flatMap((f) => {
        const n = /^(\d+)-.+\.md$/.exec(f)?.[1];
        return n ? [Number(n)] : [];
      })
    : [];
  return {
    wikidata: read("wikidata.json"),
    foodkeeper: read("foodkeeper.json"),
    specs,
  };
}
