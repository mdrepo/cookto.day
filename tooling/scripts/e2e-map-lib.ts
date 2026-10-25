// The e2e map: which spec files run which source lines (the smart pre-push,
// agreed 24 Oct). The deploy's full browser run records, per test, the
// functions Chromium ran in the built scripts; their source maps turn each
// into a source file and its lines. Pure: the CLI in e2e-map.ts reads the
// files and asks git.

/** A source file's functions: first line, last line, the specs that ran it. */
export type Ranges = [number, number, number[]][];

export interface E2eMap {
  /** The commit the map was recorded on. */
  commit: string;
  /** Spec files, from the repository's root: "apps/web/e2e/kitchen.spec.ts". */
  specs: string[];
  /** Source files, from the root, to their functions. */
  files: Record<string, Ranges>;
}

/** One test's record: its spec, and each script's functions that ran. */
export interface Coverage {
  spec: string;
  scripts: Record<string, [number, number][]>;
}

export interface Script {
  code: string;
  sources: string[];
  mappings: string;
}

/** A generated column, and where it came from: source, line, column. */
type Segment = [number, number, number, number];

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** One segment's numbers, from base64 VLQ. */
function vlq(text: string): number[] {
  const out: number[] = [];
  let value = 0;
  let shift = 0;
  for (const ch of text) {
    const digit = B64.indexOf(ch);
    value += (digit & 31) << shift;
    if (digit & 32) shift += 5;
    else {
      out.push(value & 1 ? -(value >>> 1) : value >>> 1);
      value = 0;
      shift = 0;
    }
  }
  return out;
}

/** A source map's mappings, by generated line, each line's in column order. */
export function decodeMappings(mappings: string): Segment[][] {
  const lines: Segment[][] = [];
  let source = 0;
  let line = 0;
  let column = 0;
  for (const text of mappings.split(";")) {
    const segments: Segment[] = [];
    let generated = 0;
    for (const part of text.split(",")) {
      if (part === "") continue;
      const v = vlq(part);
      generated += v[0] ?? 0;
      if (v.length < 4) continue;
      source += v[1] ?? 0;
      line += v[2] ?? 0;
      column += v[3] ?? 0;
      segments.push([generated, source, line, column]);
    }
    lines.push(segments);
  }
  return lines;
}

/** Where a generated line and column came from: source index, 1-based line. */
export function lookup(
  lines: Segment[][],
  line: number,
  column: number,
): { source: number; line: number } | null {
  const segments = lines[line] ?? [];
  let found: Segment | undefined;
  for (const s of segments) {
    if (s[0] > column) break;
    found = s;
  }
  return found ? { source: found[1], line: found[2] + 1 } : null;
}

/** An offset in the code, as its 0-based line and column. */
function positions(code: string): (offset: number) => [number, number] {
  const starts = [0];
  for (let i = 0; i < code.length; i++)
    if (code.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return [lo, offset - (starts[lo] ?? 0)];
  };
}

/**
 * The map, from every test's record. `script` reads a built script and its
 * source map; `inRepo` turns a map's source into a path from the root, or
 * null for what isn't ours (React). A function whose start and end come
 * from different sources is a bundle's wrapper, and is left out.
 */
export function buildMap(
  records: Coverage[],
  script: (name: string) => Script | null,
  inRepo: (source: string) => string | null,
  commit: string,
): E2eMap {
  const specs: string[] = [];
  const files = new Map<string, Map<string, Set<number>>>();
  const read = new Map<string, ReturnType<typeof prepare> | null>();
  function prepare(s: Script) {
    return {
      at: positions(s.code),
      lines: decodeMappings(s.mappings),
      paths: s.sources.map(inRepo),
    };
  }
  for (const record of records) {
    let spec = specs.indexOf(record.spec);
    if (spec < 0) spec = specs.push(record.spec) - 1;
    for (const [name, ran] of Object.entries(record.scripts)) {
      if (!read.has(name)) {
        const s = script(name);
        read.set(name, s && prepare(s));
      }
      const s = read.get(name);
      if (!s) continue;
      for (const [start, end] of ran) {
        const from = lookup(s.lines, ...s.at(start));
        const to = lookup(s.lines, ...s.at(Math.max(start, end - 1)));
        if (!from || !to || from.source !== to.source) continue;
        const path = s.paths[from.source];
        if (!path) continue;
        const key = `${String(from.line)}:${String(Math.max(from.line, to.line))}`;
        const ranges = files.get(path) ?? new Map<string, Set<number>>();
        files.set(path, ranges);
        const ranBy = ranges.get(key) ?? new Set<number>();
        ranges.set(key, ranBy.add(spec));
      }
    }
  }
  const out: Record<string, Ranges> = {};
  for (const [path, ranges] of [...files].sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    out[path] = [...ranges].map(([key, ranBy]) => {
      const [a, b] = key.split(":").map(Number);
      return [a ?? 0, b ?? 0, [...ranBy].sort((x, y) => x - y)];
    });
  return { commit, specs, files: out };
}
