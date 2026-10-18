// Mutation testing (ADR 0029): do the tests catch a bug? It changes the
// engine's and the use cases' code one small step at a time (a `<` becomes
// `<=`, a `&&` becomes `||`, a `true` becomes `false`) and runs that
// package's tests. A change no test notices "survives": a line the tests
// don't really check.
//
//   bun run mutate                  every package, a report
//   bun run mutate engine           one package
//   bun run mutate --min 80         fail below 80% caught
//
// It works in a throwaway worktree, so a crash never leaves broken code in
// yours. No dependency: Stryker doesn't run Bun's test runner.

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = join(import.meta.dir, "../..");
const args = process.argv.slice(2);
const minAt = args.indexOf("--min");
const min = minAt >= 0 ? Number(args[minAt + 1]) : null;
const wanted = args.filter(
  (a, i) => !a.startsWith("--") && (minAt < 0 || i !== minAt + 1),
);
const PACKAGES = ["engine", "usecases"].filter(
  (p) => wanted.length === 0 || wanted.includes(p),
);

/** Each change: what it finds, and what it puts instead. */
const MUTATIONS: [RegExp, string][] = [
  [/ === /, " !== "],
  [/ !== /, " === "],
  [/ <= /, " < "],
  [/ >= /, " > "],
  [/ < /, " <= "],
  [/ > /, " >= "],
  [/ && /, " || "],
  [/ \|\| /, " && "],
  [/ \+ /, " - "],
  [/ - /, " + "],
  [/\btrue\b/, "false"],
  [/\bfalse\b/, "true"],
  [/!(?=[a-zA-Z(])/, ""],
  [/\.some\(/, ".every("],
  [/\.every\(/, ".some("],
];

/** Lines worth changing: code, not comments, imports or types. */
function codeLine(line: string): boolean {
  const t = line.trim();
  return !(
    t === "" ||
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("import ") ||
    t.startsWith("export {") ||
    t.startsWith("export type") ||
    t.startsWith("type ") ||
    t.startsWith("interface ") ||
    /^[a-zA-Z]+\??: [A-Za-z<>[\]| "'-]+;$/.test(t)
  );
}

interface Mutant {
  file: string;
  line: number;
  from: string;
  to: string;
}

function mutantsOf(file: string, source: string): Mutant[] {
  return source.split("\n").flatMap((text, i) =>
    codeLine(text)
      ? MUTATIONS.flatMap(([find, put]) => {
          const to = text.replace(find, put);
          return to === text ? [] : [{ file, line: i + 1, from: text, to }];
        })
      : [],
  );
}

const dir = mkdtempSync(join(tmpdir(), "mutate-"));
spawnSync("git", ["worktree", "add", "--detach", dir, "HEAD"], {
  cwd: repo,
  stdio: "ignore",
});
// The tests import their own package's code by path, so the worktree's
// copy is the one changed; other packages come through this repo's links.
for (const at of [".", ...PACKAGES.map((p) => `packages/${p}`)]) {
  const modules = join(repo, at, "node_modules");
  if (existsSync(modules)) symlinkSync(modules, join(dir, at, "node_modules"));
}

const survivors: Mutant[] = [];
let total = 0;
try {
  for (const pkg of PACKAGES) {
    const src = join(dir, "packages", pkg, "src");
    const test = () =>
      spawnSync("bun", ["test"], {
        cwd: join(dir, "packages", pkg),
        stdio: "ignore",
      }).status === 0;
    if (!test()) throw new Error(`${pkg}: the tests fail before any change.`);
    for (const name of readdirSync(src).filter((f) => f.endsWith(".ts"))) {
      if (name === "index.ts") continue;
      const path = join(src, name);
      const original = readFileSync(path, "utf8");
      const lines = original.split("\n");
      for (const m of mutantsOf(`packages/${pkg}/src/${name}`, original)) {
        total++;
        const changed = [...lines];
        changed[m.line - 1] = m.to;
        writeFileSync(path, changed.join("\n"));
        if (test()) survivors.push(m);
      }
      writeFileSync(path, original);
    }
  }
} finally {
  spawnSync("git", ["worktree", "remove", "--force", dir], {
    cwd: repo,
    stdio: "ignore",
  });
  rmSync(dir, { recursive: true, force: true });
}

const caught = total - survivors.length;
const score = total === 0 ? 100 : Math.round((caught / total) * 100);
for (const m of survivors)
  console.log(
    `  survived  ${m.file}:${m.line}\n    ${m.from.trim()}\n  → ${m.to.trim()}`,
  );
console.log(
  `\nmutate: ${caught} of ${total} changes caught by a test (${score}%) in ${PACKAGES.join(", ")}.`,
);
if (min !== null && score < min) {
  console.error(`mutate: below the ${min}% the owner set (ADR 0029).`);
  process.exit(1);
}
