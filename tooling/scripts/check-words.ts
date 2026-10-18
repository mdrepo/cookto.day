import { existsSync, readdirSync, readFileSync } from "node:fs";
import { en } from "../../apps/web/src/i18n/en.js";
import { type Entry, wordProblems } from "./words-lib.js";

// The words check (ADR 0027): the app's English words, every pack's, and
// every food's English names hold no AI-tell words and no emoji. The list
// is tooling/banned-words.json.

function entries(file: string, value: unknown, key = ""): Entry[] {
  if (typeof value === "string") return [{ file, key, text: value }];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) =>
      entries(file, v, key ? `${key}.${k}` : k),
    );
  return [];
}

const all = entries("apps/web/src/i18n/en.ts", en);
const packs = existsSync("packs") ? readdirSync("packs") : [];
for (const pack of packs) {
  const file = `packs/${pack}/words/en.json`;
  if (existsSync(file))
    all.push(...entries(file, JSON.parse(readFileSync(file, "utf8"))));
}
// Food's English names live with the food (specs/148).
const foods = existsSync("packs/ingredients")
  ? readdirSync("packs/ingredients").filter((f) => f.endsWith(".json"))
  : [];
for (const food of foods) {
  const file = `packs/ingredients/${food}`;
  const { names } = JSON.parse(readFileSync(file, "utf8")) as {
    names: { text: string; lang: string }[];
  };
  for (const [i, name] of names.entries())
    if (name.lang === "en")
      all.push({ file, key: `names.${String(i)}`, text: name.text });
}

const { words } = JSON.parse(
  readFileSync("tooling/banned-words.json", "utf8"),
) as { words: string[] };
const problems = wordProblems(all, words);
if (problems.length > 0) {
  console.error(
    `Words check failed:\n${problems.map((p) => `  ${p}`).join("\n")}\n` +
      `If a banned word is truly the right one, stop and ask a code owner.`,
  );
  process.exit(1);
}
console.log(`Words: ${all.length} strings, no banned words and no emoji.`);
