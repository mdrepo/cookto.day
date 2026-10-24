import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildGraph, parseHistory } from "./city-graph-lib.js";
import { board } from "./city-notices-lib.js";
import { people } from "./city-people-lib.js";
import { skills, specs, stamps } from "./city-room-lib.js";

// bun run city: draws the repo as a night city, every file a building, into
// .build/city/index.html (open it in a browser), with graph.json beside it.
// Downtown is one block per feature with its screens on the street; the
// design kit, the works (use cases, data, engine), the pack warehouses and
// the API Worker's port stand behind. Click a building for what it is, in
// plain words, with its functions, specs and a link to the file on GitHub.
// A notice board lists the gaps and copies the scan found (city-notices-lib)
// and what to do first; the statute book lists AGENTS.md's rules and who
// enforces each. The page's parts live in tooling/city/, stitched in name
// order, with the graph put in at __GRAPH__. Pass --out <dir> to write
// somewhere else.

// Runs from the repo root wherever it was started: paths are repo-relative.
process.chdir(join(import.meta.dir, "../.."));
const PARTS = "city/page";
const GITHUB = "https://github.com/mdrepo/cookto.day/blob/main/";

const outAt = process.argv.indexOf("--out");
const out =
  outAt > 0 ? (process.argv[outAt + 1] ?? ".build/city") : ".build/city";

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 << 20 });
const files = git("ls-files").trim().split("\n");
const history = parseHistory(
  git(
    "log",
    "--reverse",
    "--format=@@%h|%ad|%s",
    "--date=short",
    "--name-status",
  ),
);
const repoNow = {
  files,
  read: (path: string) => readFileSync(path, "utf8"),
  history,
};
const graph = buildGraph(repoNow);

// The English words, for what each screen shows (city-screens-lib).
const { en } = (await import(
  join(process.cwd(), "apps/web/src/i18n/en.ts")
)) as {
  en: Record<string, unknown>;
};
const notices = board(
  graph,
  { files, read: (p) => readFileSync(p, "utf8"), history },
  en,
);

// What GitHub's public API says about CI and deploys on main; a token in
// GH_TOKEN or GITHUB_TOKEN, when there is one, only lifts the rate limit.
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const ask = (path: string): unknown => {
  try {
    const auth = token ? ["-H", `Authorization: Bearer ${token}`] : [];
    const url = `https://api.github.com/repos/mdrepo/cookto.day/${path}`;
    return JSON.parse(
      execFileSync("curl", ["-sf", "--max-time", "10", ...auth, url], {
        encoding: "utf8",
      }),
    );
  } catch {
    return null;
  }
};
const crew = people({
  files,
  read: (p) => readFileSync(p, "utf8"),
  scripts: (
    JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    }
  ).scripts,
  ask,
});

const head = history.commits[history.commits.length - 1];
const data = {
  repo: "cookto.day",
  github: GITHUB,
  scanned: new Date().toISOString().slice(0, 10),
  head,
  commits: history.commits.map((c) => [c.d, c.m.slice(0, 90)]),
  ...graph,
  ...notices,
  people: crew,
  // The town hall's filing cabinet and the workshop (#252).
  specs: specs(repoNow),
  skills: skills(repoNow),
  stamps: stamps(repoNow),
};
const page = readdirSync(PARTS)
  .filter((f) => f.endsWith(".html"))
  .sort()
  .map((f) => readFileSync(join(PARTS, f), "utf8"))
  .join("\n")
  // Inside a <script>, "</" would end it early.
  .replace("__GRAPH__", JSON.stringify(data).replace(/<\//g, "<\\/"));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "graph.json"), JSON.stringify(data));
writeFileSync(join(out, "index.html"), page);

const by: Record<string, number> = {};
for (const n of graph.nodes) by[n.layer] = (by[n.layer] ?? 0) + 1;
const posted = notices.notices.filter((n) => n.items.length);
console.log(
  `City: ${graph.nodes.length} buildings (${Object.entries(by)
    .map(([k, v]) => `${k} ${v}`)
    .join(
      ", ",
    )}), ${graph.edges.length} roads, ${history.commits.length} commits at ${head?.h ?? "?"}.\nNotices: ${posted.map((n) => `${n.title.toLowerCase()} ${n.items.length}`).join(", ")}. Open ${join(out, "index.html")}`,
);
