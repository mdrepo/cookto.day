import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Pack, SampleItem, Sources } from "./packs-lib.js";

// Reads packs and their stored sources from disk: packs/<id>/ holds
// pack.json, staples.json, ingredients/<slug>.json, dishes/<slug>.json and
// words/<lang>.json (ADR 0015, 0027), and photos/<dish>.webp with its
// .small.webp (specs/118).

export const PACKS = "packs";
export const SOURCES = join(PACKS, "sources");

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

export function readPacks(): Pack[] {
  if (!existsSync(PACKS)) return [];
  return readdirSync(PACKS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "sources")
    .map((d) => {
      const dir = join(PACKS, d.name);
      const meta = json(join(dir, "pack.json")) as Pick<
        Pack,
        "languages" | "parts"
      >;
      return {
        id: d.name,
        ...meta,
        staples: json(join(dir, "staples.json")) as Pack["staples"],
        ingredients: folder(join(dir, "ingredients")),
        dishes: folder(join(dir, "dishes")),
        words: folder(join(dir, "words")),
        photos: photos(join(dir, "photos")),
        ...(existsSync(join(dir, "sample.json"))
          ? { sample: json(join(dir, "sample.json")) as SampleItem[] }
          : {}),
      };
    });
}

export function readSources(): Sources {
  const read = (name: string) => {
    const path = join(SOURCES, name);
    return existsSync(path) ? (json(path) as Record<string, never>) : {};
  };
  return {
    wikidata: read("wikidata.json"),
    foodkeeper: read("foodkeeper.json"),
  };
}
