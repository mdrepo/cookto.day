// Pure parts of the file size check (scripts/check-file-size.ts), with unit
// tests. Small files are easier to read, review and change, for people and
// agents alike: a component stays under 150 lines, any other file under 300.

/** A component: a .tsx file in an app's or a package's src/. */
const COMPONENT = /^(apps|packages)\/[^/]+\/src\/.+\.tsx$/;
/** Not read as lines: the lockfile, which Bun writes, and images. */
const SKIP = /^bun\.lock$|\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|pdf)$/i;

export const COMPONENT_LIMIT = 150;
export const FILE_LIMIT = 300;

/** How many lines a file may have, or null when it isn't checked. */
export function limitFor(path: string): number | null {
  if (SKIP.test(path)) return null;
  return COMPONENT.test(path) ? COMPONENT_LIMIT : FILE_LIMIT;
}

/** Lines in a file's text, not counting the newline at the end. */
export function lineCount(text: string): number {
  if (text === "") return 0;
  return text.replace(/\n$/, "").split("\n").length;
}

/** Each file over its limit, with what to do about it. */
export function sizeProblems(
  files: { path: string; lines: number }[],
): string[] {
  return files.flatMap(({ path, lines }) => {
    const limit = limitFor(path);
    if (limit === null || lines <= limit) return [];
    const what = limit === COMPONENT_LIMIT ? "a component" : "a file";
    const how =
      limit === COMPONENT_LIMIT
        ? "Split it into smaller components"
        : "Split it into smaller files";
    return [
      `${path}: ${lines} lines, over ${limit} for ${what}. ${how}; don't raise the limit.`,
    ];
  });
}
