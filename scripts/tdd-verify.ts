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
import { claimedExemption } from "./pr-rules.js";
import {
  changedLines,
  touchedTests,
  type TestResult,
} from "./tdd-verify-lib.js";

// ADR 0002: proves this branch's new or changed tests are real.
//   - Each must FAIL against main's source (src/ as on main), so
//     it tests something main doesn't do yet.
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
const changedTests = git(
  "diff",
  "--name-only",
  "--diff-filter=AM",
  base,
  "HEAD",
  "--",
  "test",
  "e2e",
)
  .split("\n")
  .filter((f) => /^test\/.+\.test\.ts$|^e2e\/.+\.spec\.ts$/.test(f))
  // CI has no browser (ADR 0004), so it checks unit tests only; e2e runs
  // in the pre-push hook.
  .filter((f) => !unitOnly || f.startsWith("test/"));

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

function runE2e(cwd: string, files: string[], port: number): TestResult[] {
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
        file: `e2e/${spec.file}`,
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
      changedTests.filter((f) => f.startsWith("test/")),
    ),
    ...runE2e(
      cwd,
      changedTests.filter((f) => f.startsWith("e2e/")),
      port,
    ),
  ];
}

/** A worktree with this branch's tests and main's source. */
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
      "--",
      "src",
    )
      .split("\n")
      .filter(Boolean);
    for (const f of addedSource) rmSync(join(dir, f));
    if (git("ls-tree", "-r", "--name-only", base, "--", "src")) {
      execFileSync("git", ["checkout", base, "--", "src"], {
        cwd: dir,
        stdio: "ignore",
      });
    }
    symlinkSync(resolve(repo, "node_modules"), join(dir, "node_modules"));
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
