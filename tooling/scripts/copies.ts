// Copies (ADR 0029): the same lines written twice in shipped code. The code
// review found word lists, form helpers and rules copied between files;
// this finds the plain ones. It can't see the same idea written two ways:
// the layer rules and the cold review are for that.
//
//   bun run copies            a report
//   bun run copies --max 0    fail on any copy
//
// A copy is 6 or more lines in a row that read the same once spaces are
// tidied, in two places. No dependency: about 60 lines of our own.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repo = join(import.meta.dir, "../..");
const WINDOW = 6;
const ROOTS = ["apps/web/src", "apps/kit/src", "apps/api/src", "packages"];
const maxAt = process.argv.indexOf("--max");
const max = maxAt >= 0 ? Number(process.argv[maxAt + 1]) : null;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (["node_modules", "test", "e2e", "dist", "packs"].includes(name))
      return [];
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

/** A line as it reads: no spaces at the ends, nothing that's only noise. */
const tidy = (line: string) => line.trim().replace(/\s+/g, " ");
const noise = (line: string) =>
  line === "" ||
  /^[{}()[\];,]*$/.test(line) ||
  line.startsWith("//") ||
  line.startsWith("*") ||
  line.startsWith("import ");

const seen = new Map<string, { file: string; at: number }>();
const copies = new Map<string, string>();
for (const root of ROOTS)
  for (const path of files(join(repo, root))) {
    const lines = readFileSync(path, "utf8")
      .split("\n")
      .map((text, i) => ({ text: tidy(text), at: i + 1 }))
      .filter((l) => !noise(l.text));
    for (let i = 0; i + WINDOW <= lines.length; i++) {
      const block = lines.slice(i, i + WINDOW);
      const key = block.map((l) => l.text).join("\n");
      const file = relative(repo, path);
      const here = { file, at: block[0]?.at ?? 0 };
      const first = seen.get(key);
      if (first === undefined) seen.set(key, here);
      else if (first.file !== file && !copies.has(`${first.file} ${file}`))
        copies.set(
          `${first.file} ${file}`,
          `${first.file}:${first.at} = ${file}:${here.at}`,
        );
    }
  }

for (const where of copies.values()) console.log(`  copy  ${where}`);
console.log(
  `\ncopies: ${copies.size} pair(s) of files share ${WINDOW}+ lines.`,
);
if (max !== null && copies.size > max) process.exit(1);
