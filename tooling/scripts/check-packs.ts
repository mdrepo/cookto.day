import { readPacks, readSources } from "./packs-files.js";
import { packProblems } from "./packs-lib.js";

// packs:check (ADR 0015, 0027): every pack's dishes have sources, its
// Wikidata ids match Wikidata's labels, its shelf lives cite FoodKeeper, and
// every dish, ingredient and part has its words.

const packs = readPacks();
const sources = readSources();
const problems = packs.flatMap((pack) => packProblems(pack, sources));
if (problems.length > 0) {
  console.error(
    `Packs check failed:\n${problems.map((p) => `  packs/${p}`).join("\n")}\n` +
      `Never guess food data: find the source, then fix the pack.`,
  );
  process.exit(1);
}
const dishes = packs.reduce((n, p) => n + Object.keys(p.dishes).length, 0);
console.log(`Packs: ${packs.length} packs, ${dishes} dishes, all sourced.`);
