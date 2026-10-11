import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { claimedExemption, isSourceFile } from "./pr-rules.js";
import {
  changedLines,
  touchedTests,
  type TestResult,
} from "./tdd-verify-lib.js";

// ADR 0002: proves this branch's new or changed tests are real.
//   - Each must FAIL against main's code (every app's and package's src/,
//     and the check scripts, as on main), so it tests something main
//     doesn't do yet.
//   - Each must PASS against this branch.
// Passing on the branch rules out typos and syntax errors, so a test that
// can't even import a new function on main still counts as failing there.
//
//   bun run tdd:verify               unit and e2e tests (pre-push)
//   bun run tdd:verify --unit-only   unit tests only (CI)

const repo = process.cwd();
const unitOnly = process.argv.includes("--unit-only");
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

function mergeBase(): string {
  // In CI, compare with the PR's actual base: it isn't always main (stacked
  // PRs, release branches). Locally, with main.
  const refs = process.env.BASE_SHA
    ? [process.env.BASE_SHA]
    : ["origin/main", "main"];
  for (const ref of refs) {
    try {
      return git("merge-base", "HEAD", ref);
    } catch {
      // try the next ref
    }
  }
  throw new Error("Cannot find main or origin/main to compare against.");
}

const base = mergeBase();

// A branch with no behaviour change claims an exemption in a commit message,
// e.g. "Exemption: tooling - adds CI checks". The PR must claim it too.
// In CI the PR description is what counts (the reviewer sees it); locally,
// the branch's commit messages.
const exemption = claimedExemption(
  process.env.PR_BODY ?? git("log", "--format=%B", `${base}..HEAD`),
);
if (exemption) {
  console.log(
    `tdd:verify: skipped, this branch claims the "${exemption}" exemption (ADR 0002).`,
  );
  process.exit(0);
}
// Test files live in each workspace's test/ (unit, DOM) and an app's e2e/
// (Playwright), ADR 0016.
const UNIT = /(^|\/)test\/.+\.test\.ts$/;
const E2E = /^(.+)\/e2e\/.+\.spec\.ts$/;
const changedTests = git(
  "diff",
  "--name-only",
  "--diff-filter=AM",
  base,
  "HEAD",
)
  .split("\n")
  .filter((f) => UNIT.test(f) || E2E.test(f))
  // CI has no browser (ADR 0004), so it checks unit tests only; e2e runs
  // in the pre-push hook.
  .filter((f) => !unitOnly || UNIT.test(f));

if (changedTests.length === 0) {
  console.log("tdd:verify: no new or changed tests on this branch.");
  process.exit(0);
}

function linesChanged(file: string): number[] {
  return changedLines(git("diff", "-U0", base, "HEAD", "--", file));
}

const unescapeXml = (s: string) =>
  s
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function runUnit(cwd: string, files: string[]): TestResult[] {
  if (files.length === 0) return [];
  const out = join(mkdtempSync(join(tmpdir(), "tdd-unit-")), "junit.xml");
  spawnSync(
    "bun",
    [
      "test",
      ...files.map((f) => `./${f}`),
      "--reporter=junit",
      `--reporter-outfile=${out}`,
    ],
    { cwd, stdio: "ignore" },
  );
  if (!existsSync(out)) return [];
  const xml = readFileSync(out, "utf8");
  const results: TestResult[] = [];
  for (const m of xml.matchAll(
    /<testcase ([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g,
  )) {
    const attrs = m[1] ?? "";
    const attr = (name: string) =>
      new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? "";
    results.push({
      file: attr("file"),
      line: Number(attr("line")),
      title: unescapeXml(attr("name")),
      passed: !/<(failure|error|skipped)/.test(m[3] ?? ""),
    });
  }
  return results;
}

interface PwSpec {
  title: string;
  file: string;
  line: number;
  ok: boolean;
}
interface PwSuite {
  specs?: PwSpec[];
  suites?: PwSuite[];
}

/** Each app's e2e files run with that app's Playwright config. */
function runE2e(cwd: string, files: string[], port: number): TestResult[] {
  const byApp = new Map<string, string[]>();
  for (const f of files) {
    const app = E2E.exec(f)?.[1] ?? "";
    byApp.set(app, [...(byApp.get(app) ?? []), f.slice(app.length + 1)]);
  }
  return [...byApp].flatMap(([app, appFiles]) =>
    runAppE2e(join(cwd, app), app, appFiles, port),
  );
}

function runAppE2e(
  cwd: string,
  app: string,
  files: string[],
  port: number,
): TestResult[] {
  if (files.length === 0) return [];
  const out = join(mkdtempSync(join(tmpdir(), "tdd-e2e-")), "report.json");
  spawnSync("bunx", ["playwright", "test", ...files, "--reporter=json"], {
    cwd,
    stdio: "ignore",
    env: {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: out,
      E2E_PORT: String(port),
    },
  });
  if (!existsSync(out)) return [];
  const report = JSON.parse(readFileSync(out, "utf8")) as {
    suites?: PwSuite[];
  };
  const results: TestResult[] = [];
  const walk = (suite: PwSuite) => {
    for (const spec of suite.specs ?? []) {
      results.push({
        file: `${app}/e2e/${spec.file}`,
        line: spec.line,
        title: spec.title,
        passed: spec.ok,
      });
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return results;
}

function runAll(cwd: string, port: number): TestResult[] {
  return [
    ...runUnit(
      cwd,
      changedTests.filter((f) => UNIT.test(f)),
    ),
    ...runE2e(
      cwd,
      changedTests.filter((f) => E2E.test(f)),
      port,
    ),
  ];
}

/**
 * Code a test can be red or green against: the apps' and packages' src/,
 * and the check scripts, whose own tests live in tooling/test/.
 */
const isCode = (f: string) =>
  isSourceFile(f) || f.startsWith("tooling/scripts/");

/** A worktree with this branch's tests and main's code. */
function withMainSource<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "tdd-verify-"));
  git("worktree", "add", "--detach", dir, "HEAD");
  try {
    const addedSource = git(
      "diff",
      "--name-only",
      "--diff-filter=A",
      base,
      "HEAD",
    )
      .split("\n")
      .filter(isCode);
    for (const f of addedSource) rmSync(join(dir, f));
    const codeOnMain = git("ls-tree", "-r", "--name-only", base)
      .split("\n")
      .filter(isCode);
    if (codeOnMain.length > 0) {
      execFileSync("git", ["checkout", base, "--", ...codeOnMain], {
        cwd: dir,
        stdio: "ignore",
      });
    }
    // Workspaces link to each other through node_modules, so the worktree
    // gets its own install: a link to this repo's would point an app at the
    // branch's packages instead of main's.
    const install = spawnSync(
      "bun",
      ["install", "--frozen-lockfile", "--ignore-scripts"],
      { cwd: dir, stdio: "ignore" },
    );
    if (install.status !== 0) {
      symlinkSync(resolve(repo, "node_modules"), join(dir, "node_modules"));
    }
    return fn(dir);
  } finally {
    git("worktree", "remove", "--force", dir);
  }
}

console.log(
  `tdd:verify: ${changedTests.length} changed test file(s) since ${base.slice(0, 7)}. Running on this branch...`,
);
const onBranch = runAll(repo, 3398);
console.log("tdd:verify: running the same tests against main's source...");
const onMain = withMainSource((dir) => runAll(dir, 3397));

const tests = touchedTests(
  onBranch,
  Object.fromEntries(changedTests.map((f) => [f, linesChanged(f)])),
);
const problems: string[] = [];
for (const t of tests) {
  const main = onMain.find((r) => r.file === t.file && r.title === t.title);
  const verdict = !t.passed
    ? "FAILS on this branch"
    : main?.passed
      ? "PASSES on main"
      : "ok";
  console.log(
    `  ${verdict === "ok" ? "✓" : "✗"} ${t.file}: ${t.title}  (main: ${main ? (main.passed ? "pass" : "fail") : "did not run"}, branch: ${t.passed ? "pass" : "fail"})`,
  );
  if (verdict !== "ok") problems.push(`${t.file}: "${t.title}" ${verdict}`);
}

if (problems.length > 0) {
  console.error(`
tdd:verify failed (ADR 0002):
${problems.map((p) => `  ${p}`).join("\n")}

A test that PASSES on main doesn't test the change: make it check the new behaviour.
A test that FAILS on this branch: fix the code, not the test (tests are frozen after the "test:" commit).`);
  process.exit(1);
}
console.log(
  `tdd:verify: ${tests.length} new or changed test(s) fail on main and pass here.`,
);
