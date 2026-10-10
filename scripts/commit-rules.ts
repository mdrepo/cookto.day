// Conventional Commits (ADR 0008). A pure function, so it has unit tests; the
// commit-msg hook and the PR rules in CI both use it.

export const COMMIT_TYPES = [
  "feat",
  "fix",
  "test",
  "refactor",
  "docs",
  "chore",
  "ci",
  "build",
  "perf",
  "revert",
] as const;

/** "type(optional-scope)!: summary", with a known type and a lowercase scope. */
export const CONVENTIONAL = new RegExp(
  `^(${COMMIT_TYPES.join("|")})(\\([a-z0-9-]+\\))?!?: [^ ].*$`,
);

// Subjects git writes itself.
const GIT_WRITTEN = /^(fixup!|squash!|amend!|Merge |Revert ")/;

/**
 * Every commit is a Conventional Commit. The commit-msg hook checks this
 * locally, but hooks can be skipped, and the TDD rules read commit types.
 */
export function checkCommitSubjects(subjects: string[]): string[] {
  const bad = subjects.filter(
    (s) => !CONVENTIONAL.test(s) && !GIT_WRITTEN.test(s),
  );
  if (bad.length === 0) return [];
  return [
    `These commits are not Conventional Commits (ADR 0008):\n` +
      bad.map((s) => `  "${s}"`).join("\n") +
      `\nUse "type(optional-scope): summary" with type one of: ${COMMIT_TYPES.join(", ")}. ` +
      `To fix them, reword the commits (ask a human if you're unsure how).`,
  ];
}
