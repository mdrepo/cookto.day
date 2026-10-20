// Copies (ADR 0029): the same lines written twice in shipped code. The code
// review found word lists, form helpers and rules copied between files;
// this finds the plain ones. It can't see the same idea written two ways:
// the layer rules and the cold review are for that.
//
//   bun run copies            a report
//   bun run copies --max 0    fail on any copy
//
// A copy is 6 or more lines in a row that read the same once spaces are
// tidied, in two places. No dependency: the finder is copies-lib.ts, which
// the city (bun run city, city/) shares to pin each copy to its buildings.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findCopies, WINDOW } from "./copies-lib.js";

const repo = join(import.meta.dir, "../..");
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

const copies = findCopies(
  ROOTS.flatMap((root) => files(join(repo, root))).map((path) => ({
    path: relative(repo, path),
    text: readFileSync(path, "utf8"),
  })),
);

for (const { a, b } of copies)
  console.log(`  copy  ${a.file}:${a.at} = ${b.file}:${b.at}`);
console.log(
  `\ncopies: ${copies.length} pair(s) of files share ${WINDOW}+ lines.`,
);
if (max !== null && copies.length > max) process.exit(1);
