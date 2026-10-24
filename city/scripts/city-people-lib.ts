// The city's people (issue #247): what each one knows when tapped. The
// sentry knows the commands in package.json and the git hooks; the doctor
// the tests; the guard of honour the checks no gate stands for; the driver
// the deploys. What only GitHub knows (CI on main, deploys, what's waiting)
// comes through `ask`, so a city built offline still draws: those cards
// then say nothing was read.

export type Row = [string, string];
export interface Group {
  group: string;
  rows: Row[];
}
export interface Run {
  ok: boolean;
  when: string;
  title: string;
  url: string;
}
export interface GitHubNews {
  ci: Run | null;
  deploys: Run[];
  waiting: string[] | null;
}
export interface People {
  commands: Group[];
  hooks: Row[];
  tests: { files: number; walks: number; bugs: Row[] };
  honour: Row[];
  hats: Record<string, string>;
  github: GitHubNews | null;
}

// Each command, in plain words, and the group it belongs to.
const COMMANDS: Record<string, [string, string]> = {
  dev: ["Run and build", "Build the app and serve it on localhost:3000"],
  build: ["Run and build", "The site and the kit"],
  e2e: [
    "Run and build",
    "The browser walks: the app, the kit, the phone's database",
  ],
  check: ["Check", "Everything CI checks"],
  "check:affected": ["Check", "The same, only what a branch touches"],
  "check:repo": ["Check", "The repo-wide checks, without the workspaces"],
  typecheck: ["Check", "Types, in every workspace"],
  lint: ["Check", "ESLint, in every workspace"],
  test: ["Check", "The unit and page tests, in every workspace"],
  "tdd:verify": ["Check", "New tests fail on main and pass here"],
  "deps:check": ["Check", "Only packages on the guest list"],
  "deps:health": ["Check", "Our packages are still looked after"],
  "agents:check": ["Check", "Agent files point to AGENTS.md"],
  "design:check": ["Check", "The look follows DESIGN.md"],
  "size:check": ["Check", "Small files"],
  "packs:check": ["Check", "The cuisine packs are valid and bundled"],
  "words:check": ["Check", "No banned filler words"],
  "format:check": ["Check", "Formatting"],
  knip: ["Check", "Nothing unused"],
  new: ["Make", "A component, layout or screen, with its files"],
  tokens: ["Make", "The design's CSS and DESIGN.md's tables from its tokens"],
  "packs:bundle": ["Make", "The packs as the app loads them"],
  "packs:refresh": ["Make", "Labels from Wikidata, entries from FoodKeeper"],
  city: ["Make", "This city"],
  format: ["Tidy and review", "Fix formatting"],
  copies: ["Tidy and review", "The same lines twice"],
  review: ["Tidy and review", "A second model reads a PR and comments"],
  mutate: ["Tidy and review", "Breaks code on purpose: do the tests notice?"],
  prepare: [
    "Tidy and review",
    "Puts the sentry on duty: turns the git hooks on",
  ],
};
const GROUPS = ["Run and build", "Check", "Make", "Tidy and review", "Other"];

export function commands(scripts: Record<string, string>): Group[] {
  const by = new Map<string, Row[]>(GROUPS.map((g) => [g, []]));
  for (const [name, run] of Object.entries(scripts)) {
    const [group, what] = COMMANDS[name] ?? ["Other", run];
    by.get(group)?.push([name, what]);
  }
  return GROUPS.map((group) => ({ group, rows: by.get(group) ?? [] })).filter(
    (g) => g.rows.length,
  );
}

const HOOKS: Record<string, Row> = {
  "pre-commit": [
    "commit",
    "Prettier; ESLint and types, unless only tests are staged; gitleaks",
  ],
  "commit-msg": ["message", "type(scope): summary"],
  "pre-push": [
    "push",
    "Unit tests, tdd:verify, and e2e when an app or package changed",
  ],
};
export function hooks(files: string[]): Row[] {
  return Object.entries(HOOKS)
    .filter(([f]) => files.includes(`.githooks/${f}`))
    .map(([, row]) => row);
}

// Test files, browser walks, and the known bugs: walks marked test.fail().
export function tests(files: string[], read: (path: string) => string) {
  const walks = files.filter((f) => /(^|\/)e2e\/.*\.spec\.tsx?$/.test(f));
  const bugs: Row[] = [];
  for (const f of walks) {
    const n = (read(f).match(/\btest\.fail\(/g) ?? []).length;
    if (n)
      bugs.push([f.split("/").pop() ?? f, `${n} known bug${n > 1 ? "s" : ""}`]);
  }
  return {
    files: files.filter((f) => /\.test\.tsx?$/.test(f)).length,
    walks: walks.length,
    bugs,
  };
}

// The checks no gate stands for: the guard of honour at the town hall.
const HONOUR = [
  "size:check",
  "words:check",
  "format:check",
  "packs:check",
  "agents:check",
  "knip",
];
export function honour(scripts: Record<string, string>): Row[] {
  return HONOUR.filter((n) => n in scripts).map((n) => [
    n,
    COMMANDS[n]?.[1] ?? n,
  ]);
}

// The check's name a gate's soldier wears on the hat.
export const HATS: Record<string, string> = {
  customs: "deps:check",
  write: "ESLint",
  trade: "ESLint",
  oneway: "ESLint",
  send: "ESLint",
  kit: "design:check",
  door: "knip",
  phone: "data tests",
  leave: "fetch rule",
  ai: "API tests",
  db: "migrations",
  vault: "gitleaks",
};

// What GitHub says, through `ask` (a path under repos/<repo>/ → JSON, or
// null when it can't be read).
interface ApiRun {
  conclusion: string | null;
  created_at: string;
  display_title: string;
  html_url: string;
  head_sha: string;
}
const run = (r: ApiRun): Run => ({
  ok: r.conclusion === "success",
  when: r.created_at.slice(0, 16).replace("T", " "),
  title: r.display_title,
  url: r.html_url,
});
const runs = (ask: (p: string) => unknown, file: string) =>
  (
    ask(`actions/workflows/${file}/runs?branch=main&per_page=6`) as {
      workflow_runs?: ApiRun[];
    } | null
  )?.workflow_runs ?? null;

export function readGitHub(ask: (path: string) => unknown): GitHubNews | null {
  const ci = runs(ask, "ci.yml");
  const deploys = runs(ask, "deploy.yml");
  if (!ci && !deploys) return null;
  const done = (deploys ?? []).filter((r) => r.conclusion);
  const live = done.find((r) => r.conclusion === "success");
  const since = live
    ? (ask(`compare/${live.head_sha}...main`) as {
        commits?: { commit: { message: string } }[];
      } | null)
    : null;
  return {
    ci: ci?.find((r) => r.conclusion)
      ? run(ci.find((r) => r.conclusion) as ApiRun)
      : null,
    deploys: done.map(run),
    waiting: since?.commits
      ? since.commits.map((c) => c.commit.message.split("\n")[0] ?? "")
      : null,
  };
}

export function people(input: {
  files: string[];
  read: (path: string) => string;
  scripts: Record<string, string>;
  ask: (path: string) => unknown;
}): People {
  return {
    commands: commands(input.scripts),
    hooks: hooks(input.files),
    tests: tests(input.files, input.read),
    honour: honour(input.scripts),
    hats: HATS,
    github: readGitHub(input.ask),
  };
}
