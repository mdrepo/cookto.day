// Pure parts of packs:check (scripts/check-packs.ts), with unit tests. A pack
// is a cuisine's food data (ADR 0015, 0027). Agents draft packs and people
// check them; this check makes guessing fail: every dish has a source, every
// Wikidata id matches Wikidata's own label, and every shelf life cites the
// USDA FoodKeeper entry it comes from. Both are stored in packs/sources/ so
// the check runs offline; `bun run packs:refresh` updates them.

const SLOTS = [
  "breakfast",
  "morning-snack",
  "lunch",
  "evening-snack",
  "dinner",
];
const UNITS = ["g", "ml", "pieces"];
export const STAPLE_GROUPS = ["grains-and-dals", "spices", "basics"] as const;

export interface Keeps {
  days: number;
  in: "fridge" | "pantry";
  foodkeeper: number;
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
  source: string;
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
}

const SOURCE = /^(https:\/\/\S+|cooked at home by \S.*)$/;

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
  if (range && days >= range[0] && days <= range[1]) return [];
  const says = range
    ? `says ${range[0]} to ${range[1]}. Use a number in that range.`
    : `gives no time in the ${where}. Cite an entry that does.`;
  return [
    `${at}: keeps ${keeps.days} days in the ${where}, but FoodKeeper ${keeps.foodkeeper} (${entry.name}) ${says}`,
  ];
}

function dishProblems(pack: Pack): string[] {
  return Object.entries(pack.dishes).flatMap(([slug, dish]) => {
    const at = `${pack.id}/dishes/${slug}.json`;
    const problems: string[] = [];
    if (typeof dish.source !== "string" || !SOURCE.test(dish.source))
      problems.push(
        `${at}: no source. Add "source": a published recipe's https link, or "cooked at home by <reviewer>".`,
      );
    if (dish.slots.length === 0 || dish.slots.some((s) => !SLOTS.includes(s)))
      problems.push(`${at}: slots must be some of ${SLOTS.join(", ")}.`);
    for (const [ing, use] of Object.entries(dish.ingredients)) {
      if (!(ing in pack.ingredients))
        problems.push(
          `${at}: uses ${ing}, which has no ingredients/${ing}.json.`,
        );
      else if (!(use.amount > 0) || !UNITS.includes(use.unit))
        problems.push(
          `${at}: ${ing} needs an amount per serving above 0, in g, ml or pieces.`,
        );
    }
    for (const part of dish.servedWith ?? [])
      if (!pack.parts.includes(part))
        problems.push(
          `${at}: served with ${part}, which pack.json's parts don't list.`,
        );
    return problems;
  });
}

/** Photo licences we can use (specs/118): free, with credit at most. */
const LICENCE = /^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d)$/;
const COMMONS = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/;
const MAX = { large: 40_000, small: 8_000 } as const;

/** Every photo credited and small; every credit with its files (specs/118). */
function photoProblems(pack: Pack): string[] {
  const files = pack.photos ?? {};
  const problems: string[] = [];
  for (const [slug, dish] of Object.entries(pack.dishes)) {
    const photo = dish.photo;
    if (!photo) continue;
    const at = `${pack.id}/dishes/${slug}.json`;
    if (!photo.author.trim())
      problems.push(
        `${at}: its photo has no author. Copy "Author" from its Commons page.`,
      );
    if (!LICENCE.test(photo.licence))
      problems.push(
        `${at}: its photo's licence, ${photo.licence}, isn't one we can use. Pick a photo in the public domain, or under CC0, CC BY or CC BY-SA.`,
      );
    if (!COMMONS.test(photo.source))
      problems.push(
        `${at}: its photo's "source" must be its page on commons.wikimedia.org.`,
      );
    if (!(slug in files))
      problems.push(
        `${at}: its photo has no files. Add photos/${slug}.webp and photos/${slug}.small.webp.`,
      );
  }
  for (const [slug, sizes] of Object.entries(files)) {
    const at = `${pack.id}/photos/${slug}`;
    if (!pack.dishes[slug]?.photo) {
      problems.push(
        `${at}.webp: no dish credits it. Add "photo" to its dish, or remove the files.`,
      );
      continue;
    }
    for (const size of ["large", "small"] as const)
      if (sizes[size] > MAX[size])
        problems.push(
          `${at}${size === "small" ? ".small" : ""}.webp: ${String(Math.round(sizes[size] / 1000))} KB, over ${String(MAX[size] / 1000)} KB. Make it smaller.`,
        );
  }
  return problems;
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
