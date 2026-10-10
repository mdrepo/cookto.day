import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluateHealth, type PackageFacts } from "./dependency-health.js";

// ADR 0006: health checks for dependencies this branch adds or changes.
//
//   bun run deps:health          packages changed since main
//   bun run deps:health --all    every direct dependency
//
// In CI, BASE_SHA sets what "changed" is measured against.

type Deps = Record<string, string>;
interface Manifest {
  dependencies?: Deps;
  devDependencies?: Deps;
}
interface AllowlistEntry {
  reason: string;
  exceptions?: Record<string, string>;
}
type Allowlist = Record<
  "dependencies" | "devDependencies",
  Record<string, AllowlistEntry>
>;

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const allDeps = (m: Manifest): Deps => ({
  ...m.dependencies,
  ...m.devDependencies,
});

function changedDeps(): Deps {
  const current = allDeps(
    JSON.parse(readFileSync("package.json", "utf8")) as Manifest,
  );
  if (process.argv.includes("--all")) return current;
  const base = process.env.BASE_SHA ?? git("merge-base", "HEAD", "origin/main");
  const before = allDeps(
    JSON.parse(git("show", `${base}:package.json`)) as Manifest,
  );
  return Object.fromEntries(
    Object.entries(current).filter(([name, v]) => before[name] !== v),
  );
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

/** For deps.dev, which doesn't have data for every version: null on 404. */
async function getOptionalJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return (await res.json()) as T;
}

interface NpmVersion {
  license?: string;
  maintainers?: unknown[];
  scripts?: Record<string, string>;
  dist?: { attestations?: unknown };
}
interface DepsDevVersion {
  relatedProjects?: { projectKey: { id: string }; relationType: string }[];
}

async function scorecard(
  name: string,
  version: string,
): Promise<number | null> {
  const ver = await getOptionalJson<DepsDevVersion>(
    `https://api.deps.dev/v3/systems/npm/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
  );
  const repo = ver?.relatedProjects?.find(
    (p) => p.relationType === "SOURCE_REPO",
  );
  if (!repo) return null;
  const project = await getOptionalJson<{
    scorecard?: { overallScore: number };
  }>(
    `https://api.deps.dev/v3/projects/${encodeURIComponent(repo.projectKey.id)}`,
  );
  return project?.scorecard?.overallScore ?? null;
}

async function facts(name: string, version: string): Promise<PackageFacts> {
  const npm = await getJson<NpmVersion>(
    `https://registry.npmjs.org/${name}/${version}`,
  );
  const packument = await getJson<{ time: Record<string, string> }>(
    `https://registry.npmjs.org/${name}`,
  );
  const graph = await getOptionalJson<{ nodes: unknown[] }>(
    `https://api.deps.dev/v3/systems/npm/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}:dependencies`,
  );
  const releases = Object.entries(packument.time)
    .filter(([k]) => k !== "created" && k !== "modified")
    .map(([, date]) => date)
    .sort();
  return {
    name,
    version,
    scorecard: await scorecard(name, version),
    lastRelease: releases.at(-1) ?? "1970-01-01T00:00:00Z",
    maintainers: npm.maintainers?.length ?? 0,
    installScripts: Object.keys(npm.scripts ?? {}).filter((s) =>
      ["preinstall", "install", "postinstall"].includes(s),
    ),
    license: npm.license ?? null,
    provenance: Boolean(npm.dist?.attestations),
    transitive: graph ? Math.max(graph.nodes.length - 1, 0) : null,
  };
}

const allowlist = JSON.parse(
  readFileSync("dependency-allowlist.json", "utf8"),
) as Allowlist;
const exceptionsFor = (name: string) =>
  (allowlist.dependencies[name] ?? allowlist.devDependencies[name])
    ?.exceptions ?? {};

const toCheck = changedDeps();
if (Object.keys(toCheck).length === 0) {
  console.log("deps:health: no added or changed dependencies.");
  process.exit(0);
}

const failures: string[] = [];
for (const [name, version] of Object.entries(toCheck)) {
  const result = evaluateHealth(
    await facts(name, version),
    exceptionsFor(name),
    new Date(),
  );
  for (const w of [...result.warnings, ...result.unusedExceptions])
    console.log(`  warning  ${w}`);
  for (const f of result.failures) console.log(`  FAIL     ${f}`);
  failures.push(...result.failures);
}

if (failures.length > 0) {
  console.error(`
deps:health failed (ADR 0006). Prefer a different package, or the platform
(Bun, Web APIs, the browser). If this package really is needed, a human
owner can add an exception for the failing check in dependency-allowlist.json:
  "exceptions": { "<check>": "<why it's acceptable>" }`);
  process.exit(1);
}
console.log(`deps:health: ${Object.keys(toCheck).length} package(s) checked.`);
