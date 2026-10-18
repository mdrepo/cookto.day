// Food by the names people use (specs/148): one food, many names, in many
// languages, regions and shops. Matching reads every name: it ignores case,
// extra spaces, sizes and shop words, and tries the whole line, then its
// words. A word that could be two foods asks instead of guessing.

/** Words a shop adds to a food's name that say nothing about the food. */
const SHOP_WORDS = new Set([
  "big",
  "small",
  "fresh",
  "local",
  "organic",
  "premium",
  "imported",
  "pkt",
  "pack",
  "pc",
  "pcs",
  "loose",
]);

/** A size or a count: 500g, 1.5kg, 200 ml, 6pcs, x2. */
const SIZE = /^(x?\d+([.,]\d+)?(g|gm|kg|ml|l|ltr|pcs?|s|x)?|x\d+)$/;

/** A name or a receipt line as matching sees it: "FRESH Palak 250G" is "palak". */
export function tidy(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w !== "" && !SHOP_WORDS.has(w) && !SIZE.test(w))
    .join(" ");
}

export interface NameIndex {
  /** A tidied name to the one food it names. */
  foods: ReadonlyMap<string, string>;
  /** A tidied word that could be several foods: ask which. */
  ask: ReadonlyMap<string, readonly string[]>;
}

/** Every food's names, tidied, and the words to ask about. */
export function nameIndex(
  foods: readonly { id: string; names: readonly string[] }[],
  ask: Readonly<Record<string, readonly string[]>>,
): NameIndex {
  const named = new Map<string, string>();
  for (const food of foods)
    for (const name of food.names) named.set(tidy(name), food.id);
  return {
    foods: named,
    ask: new Map(Object.entries(ask).map(([w, ids]) => [tidy(w), ids])),
  };
}

export type FoodMatch = { food: string } | { ask: readonly string[] } | null;

/** A word as written, then without a plural ending: "tomatoes", "tomato". */
const forms = (words: string) =>
  [words, words.replace(/es$/, ""), words.replace(/s$/, "")].filter(
    (w, i, all) => w !== "" && all.indexOf(w) === i,
  );

/**
 * The food a line names: the whole line, then its longest run of words
 * that's a name, left to right. A word marked to ask is a question.
 */
export function matchFood(line: string, index: NameIndex): FoodMatch {
  const words = tidy(line).split(" ").filter(Boolean);
  for (let size = words.length; size > 0; size--)
    for (let at = 0; at + size <= words.length; at++)
      for (const form of forms(words.slice(at, at + size).join(" "))) {
        const asked = index.ask.get(form);
        if (asked) return { ask: asked };
        const food = index.foods.get(form);
        if (food) return { food };
      }
  return null;
}

/** Names that point to two foods, without a word to ask (packs:check). */
export function clashes(
  foods: readonly { id: string; names: readonly string[] }[],
  ask: Readonly<Record<string, readonly string[]>>,
): { name: string; foods: string[] }[] {
  const asked = new Set(Object.keys(ask).map(tidy));
  const owners = new Map<string, Set<string>>();
  for (const food of foods)
    for (const name of food.names) {
      const key = tidy(name);
      owners.set(key, (owners.get(key) ?? new Set()).add(food.id));
    }
  return [...owners]
    .filter(([name, ids]) => ids.size > 1 && !asked.has(name))
    .map(([name, ids]) => ({ name, foods: [...ids].sort() }));
}
