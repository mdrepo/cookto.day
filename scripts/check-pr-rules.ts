import { execFileSync } from "node:child_process";
import {
  checkAdrChange,
  checkApprovedSpec,
  checkTddCommits,
  checkTitle,
  checkUiChangesHaveE2e,
  claimedExemption,
  exemptionNotice,
  linkedIssue,
  type Commit,
  type Exemption,
} from "./pr-rules.js";
import { checkCommitSubjects } from "./commit-rules.js";

// Runs the PR rules in CI. Inputs come from the environment (see
// .github/workflows/pr-rules.yml).

const env = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} is not set`);
  return value;
};

const title = env("PR_TITLE");
const body = process.env.PR_BODY ?? "";
// stderr is discarded: `git show` of a file that's new in this PR fails by
// design, and its "fatal:" message would only confuse whoever reads the log.
const git = (...args: string[]) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const range = `${env("BASE_SHA")}...${env("HEAD_SHA")}`;
const changed = git("diff", "--name-only", range).split("\n").filter(Boolean);

// The PR's commits, oldest first, each with the files it touched.
const commits: Commit[] = git(
  "log",
  "--reverse",
  "--no-merges",
  "--format=%x00%s",
  "--name-only",
  // Two dots: only the PR's own commits, not ones main gained since.
  `${env("BASE_SHA")}..${env("HEAD_SHA")}`,
)
  .split("\0")
  .filter(Boolean)
  .map((block) => {
    const [subject = "", ...files] = block.split("\n").filter(Boolean);
    return { subject, files };
  });

const problems = [
  ...checkTitle(title),
  ...checkCommitSubjects(commits.map((c) => c.subject)),
];

// Accepted ADRs: compare each changed ADR on the base and on this PR.
const base = env("BASE_SHA");
const show = (ref: string, path: string): string | null => {
  try {
    return git("show", `${ref}:${path}`);
  } catch {
    return null;
  }
};
for (const path of changed.filter((f) => /^docs\/adr\/\d{4}-.*\.md$/.test(f))) {
  problems.push(
    ...checkAdrChange(path, show(base, path), show(env("HEAD_SHA"), path)),
  );
}
let exemption: Exemption | null = null;
try {
  exemption = claimedExemption(body);
} catch (err) {
  problems.push(err instanceof Error ? err.message : String(err));
}
problems.push(...checkUiChangesHaveE2e(changed, exemption));
const specsOnBase = git(
  "ls-tree",
  "-r",
  "--name-only",
  env("BASE_SHA"),
  "--",
  "specs",
)
  .split("\n")
  .filter(Boolean);
problems.push(
  ...checkApprovedSpec(changed, exemption, linkedIssue(body), specsOnBase),
);
const tdd = checkTddCommits(commits, exemption);
problems.push(...tdd.problems);
const notice = exemptionNotice(exemption, changed);
if (notice) console.log(`::warning title=Needs human review::${notice}`);
for (const flag of tdd.reviewFlags) {
  console.log(`::warning title=Needs human review::${flag}`);
}

if (problems.length > 0) {
  console.error(problems.join("\n\n"));
  process.exit(1);
}
console.log("PR rules pass.");
