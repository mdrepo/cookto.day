import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  evaluateHealth,
  githubRepo,
  provenanceRepo,
  type PackageFacts,
} from "./dependency-health.js";

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
  /**
   * Where the Scorecard service files the repo, when that's an older name
   * than the one the package is built from. Used only if GitHub says both
   * names are the same repo.
   */
  scorecardRepo?: string;
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
  repository?: unknown;
  dist?: { attestations?: { url?: string } };
}
interface DepsDevVersion {
  relatedProjects?: { projectKey: { id: string }; relationType: string }[];
}

/** The OpenSSF Scorecard service's score for a GitHub repo, or null. */
async function scorecardOf(repo: string): Promise<number | null> {
  const result = await getOptionalJson<{ score?: number }>(
    `https://api.securityscorecards.dev/projects/github.com/${repo}`,
  );
  return result?.score ?? null;
}

/** Whether two names lead to the same GitHub repo (renames redirect). */
async function sameGithubRepo(a: string, b: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const id = async (repo: string) => {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok ? ((await res.json()) as { id?: number }).id : undefined;
  };
  const [idA, idB] = await Promise.all([id(a), id(b)]);
  return idA !== undefined && idA === idB;
}

/**
 * The package's OpenSSF Scorecard. First from deps.dev. When deps.dev hasn't
 * linked the package to its repo, from the Scorecard service, for the repo
 * its npm provenance says it was built from, or for the allowlist's
 * `scorecardRepo` if GitHub says that is the same repo under an older name.
 * Without provenance there's no fallback: package.json can claim any repo.
 */
async function scorecard(
  name: string,
  version: string,
  npm: NpmVersion,
): Promise<number | null> {
  const ver = await getOptionalJson<DepsDevVersion>(
    `https://api.deps.dev/v3/systems/npm/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
  );
  const linked = ver?.relatedProjects?.find(
    (p) => p.relationType === "SOURCE_REPO",
  );
  if (linked) {
    const project = await getOptionalJson<{
      scorecard?: { overallScore: number };
    }>(
      `https://api.deps.dev/v3/projects/${encodeURIComponent(linked.projectKey.id)}`,
    );
    if (project?.scorecard) return project.scorecard.overallScore;
  }

  const attestationsUrl = npm.dist?.attestations?.url;
  if (!attestationsUrl) return null;
  const built = provenanceRepo(await getOptionalJson(attestationsUrl));
  if (!built) return null;
  const score = await scorecardOf(built);
  if (score !== null) {
    console.log(
      `  note     ${name}: Scorecard of ${built}, from its provenance`,
    );
    return score;
  }
  const alias = githubRepo(`github:${entryFor(name)?.scorecardRepo ?? ""}`);
  if (!alias || !(await sameGithubRepo(alias, built))) return null;
  const renamed = await scorecardOf(alias);
  if (renamed !== null)
    console.log(
      `  note     ${name}: Scorecard of ${alias}, which GitHub says is ${built} (its provenance)`,
    );
  return renamed;
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
    scorecard: await scorecard(name, version, npm),
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
function entryFor(name: string): AllowlistEntry | undefined {
  return allowlist.dependencies[name] ?? allowlist.devDependencies[name];
}
const exceptionsFor = (name: string) => entryFor(name)?.exceptions ?? {};

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
  "exceptions": { "<check>": "<why it's acceptable>" }
No Scorecard, but the repo was renamed? Set "scorecardRepo": "<old owner/name>"
instead: it counts only if GitHub says it's the repo the package was built from.`);
  process.exit(1);
}
console.log(`deps:health: ${Object.keys(toCheck).length} package(s) checked.`);
