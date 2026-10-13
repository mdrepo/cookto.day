import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pack, Sources } from "./packs-lib.js";

// Reads packs and their stored sources from disk: packs/<id>/ holds
// pack.json, staples.json, ingredients/<slug>.json, dishes/<slug>.json and
// words/<lang>.json (ADR 0015, 0027).

export const PACKS = "packs";
export const SOURCES = join(PACKS, "sources");

const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

function folder(dir: string): Record<string, never> {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f.slice(0, -5), json(join(dir, f))]),
  ) as Record<string, never>;
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
