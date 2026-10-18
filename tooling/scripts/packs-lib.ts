import { dishProblems, photoProblems, UNITS } from "./packs-dishes.js";

// Pure parts of packs:check (scripts/check-packs.ts), with unit tests. A pack
// is a cuisine's food data (ADR 0015, 0027). Agents draft packs and people
// check them; this check makes guessing fail: every dish has a source, every
// Wikidata id matches Wikidata's own label, and every shelf life cites the
// USDA FoodKeeper entry it comes from. Both are stored in packs/sources/ so
// the check runs offline; `bun run packs:refresh` updates them.

export const STAPLE_GROUPS = ["grains-and-dals", "spices", "basics"] as const;

export interface Keeps {
  days: number;
  in: "fridge" | "pantry";
  foodkeeper: number;
  /** Where FoodKeeper gives no time here: the approved spec that set one. */
  spec?: number;
}
export interface Ingredient {
  wikidata: string;
  /** Wikidata's own English label, copied exactly. */
  label: string;
  /** Fresh food only: how long it keeps, from FoodKeeper. */
  keeps?: Keeps;
}
export interface Dish {
  slots: string[];
  ingredients: Record<string, { amount: number; unit: string }>;
  servedWith?: string[];
  /**
   * The two or three full recipes it was checked against, the first linked
   * from its page; or "cooked at home by <reviewer>" (specs/149).
   */
  sources: string[];
  /** Six to eight short steps, in our own words (specs/149). */
  steps: string[];
  /** For whoever reviews the pack: what was decided, and why. */
  note?: string;
  /** A free photo of the dish, credited (specs/118). */
  photo?: { author: string; licence: string; source: string };
}
export interface Words {
  dishes: Record<string, string>;
  ingredients: Record<string, string>;
  parts: Record<string, string>;
}
export interface SampleItem {
  ingredient: string;
  amount?: number;
  unit?: string;
}
export interface Pack {
  id: string;
  languages: string[];
  parts: string[];
  staples: Record<(typeof STAPLE_GROUPS)[number], string[]>;
  ingredients: Record<string, Ingredient>;
  dishes: Record<string, Dish>;
  words: Record<string, Words>;
  /** A sample pantry, for trying the app (sample.json, optional). */
  sample?: SampleItem[];
  /** photos/<dish>.webp and .small.webp: each file's size in bytes. */
  photos?: Record<string, { large: number; small: number }>;
}
export interface FoodKeeperEntry {
  name: string;
  /** Days, least to most; null when FoodKeeper gives none. */
  fridge: [number, number] | null;
  pantry: [number, number] | null;
}
export interface Sources {
  wikidata: Record<string, string>;
  foodkeeper: Record<string, FoodKeeperEntry>;
  /** The approved specs on main, by number; unchecked when absent. */
  specs?: number[];
}

function ingredientProblems(
  pack: Pack,
  sources: Sources,
  staples: Set<string>,
): string[] {
  return Object.entries(pack.ingredients).flatMap(([slug, ing]) => {
    const at = `ingredients/${slug}.json`;
    const problems: string[] = [];
    const label = sources.wikidata[ing.wikidata];
    if (!/^Q\d+$/.test(ing.wikidata) || label === undefined)
      problems.push(
        `${at}: ${ing.wikidata} isn't in packs/sources/wikidata.json. Run \`bun run packs:refresh\`; if it still isn't there, the id doesn't exist.`,
      );
    else if (label !== ing.label)
      problems.push(
        `${at}: Wikidata calls ${ing.wikidata} "${label}", not "${ing.label}". Check the id on wikidata.org, then copy its English label exactly.`,
      );
    const keeps = ing.keeps as Partial<Keeps> | undefined;
    if (!keeps && !staples.has(slug))
      problems.push(
        `${at}: neither a staple nor fresh. List it in staples.json, or add "keeps" with its FoodKeeper entry.`,
      );
    if (keeps) problems.push(...keepsProblems(at, keeps, sources));
    return problems;
  });
}

function keepsProblems(
  at: string,
  keeps: Partial<Keeps>,
  sources: Sources,
): string[] {
  if (keeps.foodkeeper === undefined)
    return [
      `${at}: its shelf life cites no FoodKeeper entry. Add "foodkeeper": the entry's ID from packs/sources/foodkeeper.json.`,
    ];
  const entry = sources.foodkeeper[String(keeps.foodkeeper)];
  if (!entry)
    return [
      `${at}: FoodKeeper ${keeps.foodkeeper} isn't in packs/sources/foodkeeper.json. Run \`bun run packs:refresh\`.`,
    ];
  const where = keeps.in === "pantry" ? "pantry" : "fridge";
  const range = entry[where];
  const days = keeps.days ?? NaN;
  // Shorter than FoodKeeper only warns early; longer could make someone ill.
  if (range && days > 0 && days <= range[1]) return [];
  const decided =
    keeps.spec !== undefined &&
    (sources.specs === undefined || sources.specs.includes(keeps.spec));
  if (!range && days > 0 && decided) return [];
  const says = range
    ? `says ${range[0]} to ${range[1]}. Use ${range[1]} or fewer: shorter only warns early.`
    : `gives no time in the ${where}. Cite an entry that does, or the approved spec that decided it.`;
  return [
    `${at}: keeps ${keeps.days} days in the ${where}, but FoodKeeper ${keeps.foodkeeper} (${entry.name}) ${says}`,
  ];
}

function sampleProblems(pack: Pack): string[] {
  const at = `${pack.id}/sample.json`;
  return (pack.sample ?? []).flatMap(({ ingredient, amount, unit }) => {
    if (!(ingredient in pack.ingredients))
      return [`${at}: ${ingredient} has no ingredients/${ingredient}.json.`];
    const none = amount === undefined && unit === undefined;
    if (
      none ||
      (amount !== undefined && amount > 0 && UNITS.includes(unit ?? ""))
    )
      return [];
    return [
      `${at}: ${ingredient} needs an amount above 0, in g, ml or pieces, or no amount.`,
    ];
  });
}

function wordsProblems(pack: Pack): string[] {
  return pack.languages.flatMap((lang) => {
    const at = `${pack.id}/words/${lang}.json`;
    const words = pack.words[lang];
    if (!words)
      return [
        `${at}: missing. Add a word for every dish, ingredient and part.`,
      ];
    const missing = (
      kind: string,
      keys: string[],
      have: Record<string, string>,
    ) =>
      keys
        .filter((k) => !have[k]?.trim())
        .map((k) => `${at}: no word for the ${kind} ${k}.`);
    return [
      ...missing("dish", Object.keys(pack.dishes), words.dishes),
      ...missing(
        "ingredient",
        Object.keys(pack.ingredients),
        words.ingredients,
      ),
      ...missing("part", pack.parts, words.parts),
    ];
  });
}

/** Everything wrong with a pack, each saying how to fix it. */
export function packProblems(pack: Pack, sources: Sources): string[] {
  const staples = new Set(STAPLE_GROUPS.flatMap((g) => pack.staples[g]));
  const undefinedStaples = [...staples]
    .filter((s) => !(s in pack.ingredients))
    .map(
      (s) =>
        `${pack.id}/staples.json: lists ${s}, which has no ingredients/${s}.json.`,
    );
  return [
    ...ingredientProblems(pack, sources, staples),
    ...undefinedStaples,
    ...dishProblems(pack),
    ...sampleProblems(pack),
    ...wordsProblems(pack),
    ...photoProblems(pack),
  ];
}
