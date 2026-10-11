// Pure parts of tdd:verify (scripts/tdd-verify.ts), with unit tests.

export interface TestResult {
  file: string;
  /** Line where the test is declared. */
  line: number;
  title: string;
  passed: boolean;
}

/**
 * The tests a branch added or changed: a test counts as touched when any
 * added line falls between its declaration and the next test's in the same
 * file.
 */
export function touchedTests(
  results: TestResult[],
  addedLinesByFile: Record<string, number[]>,
): TestResult[] {
  const touched: TestResult[] = [];
  const files = new Set(results.map((r) => r.file));
  for (const file of files) {
    const added = addedLinesByFile[file] ?? [];
    const sorted = results
      .filter((r) => r.file === file)
      .sort((a, b) => a.line - b.line);
    sorted.forEach((t, i) => {
      const end = sorted[i + 1]?.line ?? Infinity;
      if (added.some((l) => l >= t.line && l < end)) touched.push(t);
    });
  }
  return touched;
}

// Lines that change nothing a test does: blank, only closing brackets, or
// only opening a describe block (which would otherwise count against the
// test above it).
const TRIVIAL = /^\s*([)}\];,]*|describe\(.*=>\s*\{)\s*$/;

/**
 * Line numbers (in the new file) that a `git diff -U0` changed. A pure
 * deletion counts at the line just before it, so removing e.g. `test.fail()`
 * marks the test it was in; a replaced line counts where its replacement is.
 * Blank, bracket-only and describe-opening additions don't count.
 */
export function changedLines(diff: string): number[] {
  const lines: number[] = [];
  let next = 0; // new-file line number of the next added line
  let anchor = 0; // where a deletion in this hunk sits
  for (const line of diff.split("\n")) {
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk) {
      next = Number(hunk[1]);
      // "+b,0": nothing was added and the deletion follows line b. Otherwise
      // the deleted lines were replaced by the ones starting at line b.
      anchor = next;
      continue;
    }
    if (next === 0 || line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("-")) lines.push(Math.max(anchor, 1));
    else if (line.startsWith("+")) {
      if (!TRIVIAL.test(line.slice(1))) lines.push(next);
      next++;
    }
  }
  return [...new Set(lines)];
}
