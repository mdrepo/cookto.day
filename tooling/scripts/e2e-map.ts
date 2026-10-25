import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { buildMap, type Coverage, type E2eMap } from "./e2e-map-lib.js";
import { changedLines, selectSpecs } from "./e2e-select-lib.js";

// The e2e map (the smart pre-push, agreed 24 Oct).
//   bun tooling/scripts/e2e-map.ts build
//     After the deploy's browser run with E2E_COVERAGE=1: the map, from each
//     test's record and the built scripts' source maps, to
//     apps/web/test-results/e2e-map.json. The deploy keeps it as an artifact.
//   bun tooling/scripts/e2e-map.ts select <since>
//     The specs a push needs, one per line from apps/web, or "all". It reads
//     the newest deploy's map with gh, once per map; with no map, a map from
//     a commit this branch doesn't have, or E2E=all, everything runs.
//     E2E_MAP=<file> uses a map built here instead of the deploy's.

const ROOT = resolve(import.meta.dir, "../..");
const WEB = join(ROOT, "apps/web");
const OUT = join(WEB, "test-results/e2e-map.json");

const git = (...args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  return r.exitCode === 0 ? r.stdout.toString().trim() : null;
};

function build() {
  const dir = join(WEB, "test-results/coverage");
  const records = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Coverage)
    .map((c) => ({ ...c, spec: relative(ROOT, c.spec) }));
  const dist = join(WEB, "dist");
  const map = buildMap(
    records,
    (name) => {
      const js = join(dist, name);
      if (!existsSync(`${js}.map`)) return null;
      const m = JSON.parse(readFileSync(`${js}.map`, "utf8")) as {
        sources: string[];
        mappings: string;
      };
      return { code: readFileSync(js, "utf8"), ...m };
    },
    (source) => {
      const path = relative(ROOT, resolve(dist, source));
      return /^(apps|packages)\//.test(path) ? path : null;
    },
    git("rev-parse", "HEAD") ?? "",
  );
  writeFileSync(OUT, JSON.stringify(map));
  const ranges = Object.values(map.files).reduce((n, r) => n + r.length, 0);
  console.info(
    `e2e map: ${String(map.specs.length)} specs, ${String(Object.keys(map.files).length)} files, ${String(ranges)} functions`,
  );
}

/**
 * The newest deploy's map, cached under .git; null when gh can't get it.
 * E2E_MAP=<file> reads that map instead: one `build` made on this laptop.
 */
function newestMap(): E2eMap | null {
  const local = process.env.E2E_MAP;
  if (local)
    return existsSync(local)
      ? (JSON.parse(readFileSync(local, "utf8")) as E2eMap)
      : null;
  const env = {
    ...process.env,
    GH_TOKEN: process.env.GH_TOKEN ?? process.env.GITHUB_PERSONAL_TOKEN ?? "",
  };
  if (!env.GH_TOKEN)
    delete (env as Record<string, string | undefined>).GH_TOKEN;
  const gh = (...args: string[]) => {
    const r = Bun.spawnSync(["gh", ...args], { cwd: ROOT, env });
    return r.exitCode === 0 ? r.stdout.toString().trim() : null;
  };
  const runs = gh(
    "run",
    "list",
    "--workflow",
    "deploy.yml",
    "--branch",
    "main",
    "--status",
    "success",
    "--limit",
    "1",
    "--json",
    "databaseId,headSha",
  );
  const [run] = runs
    ? (JSON.parse(runs) as { databaseId: number; headSha: string }[])
    : [];
  if (!run) return null;
  const cache = join(ROOT, git("rev-parse", "--git-dir") ?? ".git", "e2e-map");
  const file = join(cache, `${run.headSha}.json`);
  if (!existsSync(file)) {
    mkdirSync(cache, { recursive: true });
    const into = join(cache, String(run.databaseId));
    if (
      gh(
        "run",
        "download",
        String(run.databaseId),
        "-n",
        "e2e-map",
        "-D",
        into,
      ) === null
    )
      return null;
    const got = join(into, "e2e-map.json");
    if (!existsSync(got)) return null;
    writeFileSync(file, readFileSync(got));
  }
  return JSON.parse(readFileSync(file, "utf8")) as E2eMap;
}

/** Workspace names to their folders and entries, for package imports. */
function workspaces() {
  const out = new Map<
    string,
    { dir: string; exports: Record<string, string> }
  >();
  for (const base of ["packages", "apps"])
    for (const name of readdirSync(join(ROOT, base))) {
      const pkg = join(ROOT, base, name, "package.json");
      if (!existsSync(pkg)) continue;
      const p = JSON.parse(readFileSync(pkg, "utf8")) as {
        name: string;
        exports?: Record<string, string>;
      };
      out.set(p.name, { dir: `${base}/${name}`, exports: p.exports ?? {} });
    }
  return out;
}

/** Who imports each source file, from every source file's imports. */
function importGraph(): (file: string) => string[] {
  const packages = workspaces();
  const files = (git("ls-files", "apps/web/src", "packages") ?? "")
    .split("\n")
    .filter((f) => /^(apps\/web|packages\/[^/]+)\/src\/.+\.tsx?$/.test(f));
  const known = new Set(files);
  const resolveFrom = (from: string, spec: string): string | null => {
    let base: string;
    if (spec.startsWith(".")) base = join(dirname(from), spec);
    else {
      const name = /^(@cookto\/[^/]+)(\/.*)?$/.exec(spec);
      const pkg = name && packages.get(name[1] ?? "");
      const entry = pkg?.exports[`.${name?.[2] ?? ""}`];
      if (!pkg || !entry) return null;
      base = join(pkg.dir, entry);
    }
    const stem = base.replace(/\.(js|ts|tsx)$/, "");
    for (const f of [`${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`])
      if (known.has(f)) return f;
    return null;
  };
  const importers = new Map<string, string[]>();
  for (const file of files) {
    const code = readFileSync(join(ROOT, file), "utf8");
    for (const m of code.matchAll(
      /(?:from|import)\s*\(?\s*["']([^"']+)["']/g,
    )) {
      const target = resolveFrom(file, m[1] ?? "");
      if (target)
        importers.set(target, [...(importers.get(target) ?? []), file]);
    }
  }
  return (file) => importers.get(file) ?? [];
}

/** The specs to run, or why everything runs. */
function choose(since: string): string[] | string {
  if (process.env.E2E === "all") return "E2E=all";
  const map = newestMap();
  if (!map) return "no e2e map from a deploy (gh can't reach it?)";
  if (git("merge-base", "--is-ancestor", map.commit, "HEAD") === null)
    return `the map's commit ${map.commit.slice(0, 7)} isn't in this branch`;
  const fresh = (git("diff", "--name-only", since, "HEAD") ?? "")
    .split("\n")
    .filter(Boolean);
  const diff =
    git("diff", "-U0", "--no-color", map.commit, "HEAD", "--", ...fresh) ?? "";
  const specs = (git("ls-files", "apps/web/e2e") ?? "")
    .split("\n")
    .filter((f) => f.endsWith(".spec.ts"));
  const s = selectSpecs({
    fresh,
    lines: changedLines(diff),
    map,
    specs,
    importers: importGraph(),
  });
  if (s.all) return s.reason;
  console.error(
    `e2e: ${String(s.specs.length)} of ${String(specs.length)} specs, by the map of ${map.commit.slice(0, 7)}`,
  );
  return s.specs;
}

function select(since: string) {
  const chosen = choose(since);
  if (typeof chosen === "string") {
    console.error(`e2e: everything, ${chosen}`);
    console.info("all");
  } else for (const spec of chosen) console.info(relative("apps/web", spec));
}

const [command, arg] = process.argv.slice(2);
if (command === "build") build();
else if (command === "select" && arg) select(arg);
else {
  console.error("usage: e2e-map.ts build | select <since>");
  process.exit(2);
}
