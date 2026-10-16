import { COMMIT_TYPES, CONVENTIONAL } from "./commit-rules.js";

// Rules about a pull request itself (ADR 0002, 0004, 0009). Pure functions,
// so they have unit tests; scripts/check-pr-rules.ts runs them in CI.

/** Exemptions from the Spec and Red phases (ADR 0002). */
export const EXEMPTIONS = [
  "docs",
  "dependencies",
  "refactor",
  "tooling",
] as const;
export type Exemption = (typeof EXEMPTIONS)[number];

/** ADR 0009: the PR title becomes the squashed commit message on main. */
export function checkTitle(title: string): string[] {
  if (CONVENTIONAL.test(title)) return [];
  return [
    `PR title "${title}" is not a Conventional Commit (ADR 0009). ` +
      `Use "type(optional-scope): summary", where type is one of: ${COMMIT_TYPES.join(", ")}. ` +
      `Example: "fix(pantry): count days left from the bill date".`,
  ];
}

/**
 * The exemption a PR body claims, from a line like
 * "Exemption: refactor - moves code, existing e2e tests cover it".
 * Returns null when there is none; throws when the kind is unknown.
 */
export function claimedExemption(body: string): Exemption | null {
  const match = /^Exemption:\s*([a-z]+)\s*[-–—:]\s*\S/im.exec(body);
  if (!match?.[1]) return null;
  const kind = match[1].toLowerCase();
  if (!(EXEMPTIONS as readonly string[]).includes(kind)) {
    throw new Error(
      `Unknown exemption "${kind}". Use one of: ${EXEMPTIONS.join(", ")}.`,
    );
  }
  return kind as Exemption;
}

// An app's src/ runs on people's devices and can change what they see, and so
// does the design system's (ADR 0019). The engine is pure logic, which unit
// tests cover (ADR 0016), and the API is a server with its own tests (ADR 0025).
const UI_CODE = /^(apps\/(?!api\/)[^/]+|packages\/ui)\/src\//;
const E2E = /(^|\/)e2e\//;

/** ADR 0004: e2e doesn't run in CI, so a UI change must at least touch an e2e/ folder. */
export function checkUiChangesHaveE2e(
  changedFiles: string[],
  exemption: Exemption | null,
): string[] {
  const ui = changedFiles.filter((f) => UI_CODE.test(f));
  if (ui.length === 0) return [];
  if (changedFiles.some((f) => E2E.test(f))) return [];
  if (exemption) return [];
  return [
    `This PR changes UI code but no e2e test (ADR 0004):\n` +
      ui.map((f) => `  ${f}`).join("\n") +
      `\nAdd or change a test in the app's e2e/ folder that shows the behaviour, run "bun run e2e", ` +
      `and attach the video for UI changes. If the change has no behaviour change, ` +
      `add a line to the PR description such as ` +
      `"Exemption: refactor - <why existing tests cover it>" (ADR 0002).`,
  ];
}

export interface Commit {
  subject: string;
  files: string[];
}

// Code that ships: each app's and package's src/ (ADR 0016).
const SOURCE = /^(apps|packages)\/[^/]+\/src\//;
const TEST_FILES = /(^|\/)(test|e2e)\//;
/** App code that ships to users. */
export const isSourceFile = (f: string) => SOURCE.test(f);
// Each app's build scripts: what they build is what the app's tests check.
const APP_SCRIPTS = /^apps\/[^/]+\/scripts\//;
/**
 * Code a test can be red or green against, which tdd:verify swaps for main's
 * (ADR 0002): the apps' and packages' src/, the apps' build scripts, and the
 * check scripts, whose own tests live in tooling/test/.
 */
export const isVerifiableCode = (f: string) =>
  isSourceFile(f) || APP_SCRIPTS.test(f) || f.startsWith("tooling/scripts/");
const isTestCommit = (c: Commit) =>
  /^test(\([a-z0-9-]+\))?!?: /.test(c.subject);

export interface TddResult {
  problems: string[];
  /** Not failures, but a human must look (ADR 0002). */
  reviewFlags: string[];
}

/**
 * ADR 0002, checked from the PR's commits (oldest first): a behaviour change
 * has a spec, its tests come first in a `test:` commit, and tests don't
 * change afterwards except in their own `test:` commits.
 */
export function checkTddCommits(
  commits: Commit[],
  exemption: Exemption | null,
): TddResult {
  const result: TddResult = { problems: [], reviewFlags: [] };
  const allFiles = commits.flatMap((c) => c.files);
  if (exemption || !allFiles.some((f) => SOURCE.test(f))) return result;

  const firstSource = commits.findIndex((c) =>
    c.files.some((f) => SOURCE.test(f)),
  );
  const redBefore = commits
    .slice(0, firstSource)
    .some((c) => isTestCommit(c) && c.files.some((f) => TEST_FILES.test(f)));
  if (!redBefore) {
    result.problems.push(
      `No "test:" commit with failing tests comes before the first commit that changes app code (apps/*/src, packages/*/src) ` +
        `(ADR 0002, phase 1). Commit the failing tests on their own first, as "test: ...", ` +
        `then the code.`,
    );
  }

  for (const [i, c] of commits.entries()) {
    const tests = c.files.filter((f) => TEST_FILES.test(f));
    if (tests.length === 0) continue;
    if (!isTestCommit(c)) {
      result.problems.push(
        `"${c.subject}" changes test files but isn't a "test:" commit:\n` +
          tests.map((f) => `  ${f}`).join("\n") +
          `\nTests only change in "test:" commits (ADR 0002). Don't edit a test to make it ` +
          `pass. If the test was genuinely wrong, fix it in its own "test:" commit and say why.`,
      );
    } else if (i > firstSource) {
      result.reviewFlags.push(
        `"${c.subject}" changes tests after the code was written. A human must check ` +
          `the test was wrong, not weakened to pass (ADR 0002).`,
      );
    }
  }
  return result;
}

/** The text of a markdown section, from its "## " heading to the next. */
function section(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  return lines
    .slice(start, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

const status = (markdown: string) =>
  /^- \*\*Status:\*\* (.+)$/m.exec(markdown)?.[1]?.trim() ?? "";

/**
 * ADR README: an accepted ADR's decision is never edited. To change it, write
 * a new ADR that supersedes it; the old one may only change its status to
 * "Superseded by NNNN" (and gain notes outside the Decision section).
 */
export function checkAdrChange(
  path: string,
  before: string | null,
  after: string | null,
): string[] {
  if (before === null || !/^Accepted\b/.test(status(before))) return [];
  const fix =
    `To change a decision, write a new ADR (copy docs/adr/template.md, next free number) ` +
    `that supersedes it, and set this one's status to "Superseded by NNNN". A human must approve the new ADR.`;
  if (after === null)
    return [`${path} is an accepted ADR and must not be deleted. ${fix}`];
  const problems: string[] = [];
  if (section(before, "Decision") !== section(after, "Decision")) {
    problems.push(
      `${path}: the Decision section of an accepted ADR was edited. ${fix}`,
    );
  }
  const newStatus = status(after);
  if (
    newStatus !== status(before) &&
    !/^Superseded by \d{4}$/.test(newStatus)
  ) {
    problems.push(
      `${path}: an accepted ADR's status can only change to "Superseded by NNNN", not "${newStatus}".`,
    );
  }
  return problems;
}

/** The issue a PR body links with "Closes #N" (or Fixes/Resolves), if any. */
export function linkedIssue(body: string): number | null {
  const match = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/i.exec(
    body,
  );
  return match?.[1] ? Number(match[1]) : null;
}

/**
 * ADR 0002, phase 0, made enforceable: a behaviour change needs a spec that a
 * code owner approved, and the approval is merging it. So the spec for the
 * PR's issue must already be on the base branch (specs/ is code-owned), not
 * added by the same PR.
 */
export function checkApprovedSpec(
  changedFiles: string[],
  exemption: Exemption | null,
  issue: number | null,
  specsOnBase: string[],
): string[] {
  if (exemption || !changedFiles.some((f) => SOURCE.test(f))) return [];
  if (issue === null) {
    return [
      `This PR changes app code (apps/*/src, packages/*/src) but doesn't link its issue. Add "Closes #<issue>" to the PR ` +
        `description (ADR 0002). Every behaviour change starts from a GitHub issue.`,
    ];
  }
  const spec = new RegExp(`^specs/${issue}-.+\\.md$`);
  if (specsOnBase.some((f) => spec.test(f))) return [];
  return [
    `No approved spec for #${issue} on main (ADR 0002, phase 0). First open a separate PR ` +
      `that only adds specs/${issue}-<short-name>.md (copy specs/TEMPLATE.md). A code owner ` +
      `merging that PR is the approval. Then rebase this PR on main.`,
  ];
}

/**
 * An exemption switches off the spec, TDD-order and UI-e2e rules, and anyone
 * (or any agent) can write one into a PR description. So when it's claimed
 * on a PR that changes app code, the reviewer is told to check it.
 */
export function exemptionNotice(
  exemption: Exemption | null,
  changedFiles: string[],
): string | null {
  if (!exemption || !changedFiles.some(isSourceFile)) return null;
  return (
    `This PR claims the "${exemption}" exemption while changing app code, which switches off ` +
    `the spec, test-first and e2e rules. The reviewer must confirm it really has no behaviour change.`
  );
}
