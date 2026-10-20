// The pure part of the copies report (scripts/copies.ts) and of the city's
// "same lines twice" notice (scripts/city-dups-lib.ts): the same WINDOW
// lines in a row, read the same once spaces are tidied, in two files.

export const WINDOW = 6;

export interface Copy {
  a: { file: string; at: number };
  b: { file: string; at: number };
}

/** A line as it reads: no spaces at the ends, nothing that's only noise. */
export const tidy = (line: string): string => line.trim().replace(/\s+/g, " ");
export const noise = (line: string): boolean =>
  line === "" ||
  /^[{}()[\];,]*$/.test(line) ||
  line.startsWith("//") ||
  line.startsWith("*") ||
  line.startsWith("import ");

/** Each pair of files that share WINDOW or more lines, once per pair. */
export function findCopies(
  files: { path: string; text: string }[],
  window = WINDOW,
): Copy[] {
  const seen = new Map<string, { file: string; at: number }>();
  const copies = new Map<string, Copy>();
  for (const { path, text } of files) {
    const lines = text
      .split("\n")
      .map((raw, i) => ({ text: tidy(raw), at: i + 1 }))
      .filter((l) => !noise(l.text));
    for (let i = 0; i + window <= lines.length; i++) {
      const block = lines.slice(i, i + window);
      const key = block.map((l) => l.text).join("\n");
      const here = { file: path, at: block[0]?.at ?? 0 };
      const first = seen.get(key);
      if (first === undefined) seen.set(key, here);
      else if (first.file !== path && !copies.has(`${first.file} ${path}`))
        copies.set(`${first.file} ${path}`, { a: first, b: here });
    }
  }
  return [...copies.values()];
}
