import type { E2eMap } from "./e2e-map-lib.js";

// Which browser specs a push needs (the smart pre-push, agreed 24 Oct): the
// specs that ran a changed function, by the e2e map. Anything the map can't
// answer for runs everything: a change every page loads (the page shell,
// global styles, tokens, the build, packages), the e2e helpers, or so much
// that most specs would run anyway. Pure: e2e-map.ts asks git.

/** Lines changed in a file, as the map's commit numbers them. */
export type Lines = Record<string, [number, number][]>;

export type Selection =
  { all: true; reason: string } | { all: false; specs: string[] };

export interface Push {
  /** Files changed since the last push, from the root. */
  fresh: string[];
  /** Their lines changed since the map's commit, in that commit's numbering. */
  lines: Lines;
  map: E2eMap;
  /** Every spec file on disk, from the root. */
  specs: string[];
  /** The source files that import this one. */
  importers: (file: string) => string[];
}

/** Every page loads these, or they run every test: everything runs. */
const EVERYTHING = [
  /^(package\.json|bun\.lock|bunfig\.toml|tsconfig[^/]*\.json)$/,
  /^packages\/[^/]+\/(package|tsconfig)\.json$/,
  /^apps\/web\/(package\.json|tsconfig\.json|playwright\.config\.ts)$/,
  /^apps\/web\/scripts\//,
  /^apps\/web\/src\/[^/]+\.html$/,
  /^apps\/web\/e2e\/support\//,
  /^packages\/ui\/tokens\//,
  /^(apps\/web|packages\/[^/]+)\/src\/.*(?<!\.module)\.css$/,
];

const SPEC = /^apps\/web\/e2e\/[^/]+\.spec\.ts$/;
const SOURCE = /^(apps\/web|packages\/[^/]+)\/src\/.+\.tsx?$/;
/** Past this share of the specs, the selection saves nothing worth a gap. */
const MOST = 0.8;

const overlaps = (a: [number, number], b: [number, number]) =>
  a[0] <= b[1] && b[0] <= a[1];

/** The specs that ran any of a file's functions. */
function wholeFile(map: E2eMap, file: string): number[] {
  return (map.files[file] ?? []).flatMap(([, , specs]) => specs);
}

/** The specs that ran a function on one of these lines. */
function onLines(map: E2eMap, file: string, lines: [number, number][]) {
  return (map.files[file] ?? [])
    .filter(([a, b]) => lines.some((l) => overlaps([a, b], l)))
    .flatMap(([, , specs]) => specs);
}

/**
 * A file the map never saw (new, or only run as a bundle's top level): the
 * specs of the nearest mapped files that import it. None means the page
 * doesn't load it.
 */
function byImporters(push: Push, file: string): number[] {
  const found: number[] = [];
  const seen = new Set([file]);
  let edge = [file];
  for (let depth = 0; depth < 12 && edge.length > 0; depth++) {
    const next: string[] = [];
    for (const f of edge)
      for (const importer of push.importers(f)) {
        if (seen.has(importer)) continue;
        seen.add(importer);
        if (push.map.files[importer])
          found.push(...wholeFile(push.map, importer));
        else next.push(importer);
      }
    edge = next;
  }
  return found;
}

export function selectSpecs(push: Push): Selection {
  const { map } = push;
  const picked = new Set<string>();
  const add = (indexes: number[]) => {
    for (const i of indexes) {
      const spec = map.specs[i];
      if (spec) picked.add(spec);
    }
  };
  for (const file of push.fresh) {
    if (EVERYTHING.some((r) => r.test(file)))
      return { all: true, reason: `${file} reaches every page or test` };
    if (SPEC.test(file)) {
      picked.add(file);
      continue;
    }
    // A component's styles: the specs that show the component.
    const source = file.endsWith(".module.css")
      ? file.replace(/\.module\.css$/, ".tsx")
      : file;
    if (!SOURCE.test(source)) continue;
    if (!map.files[source]) {
      add(byImporters(push, source));
      continue;
    }
    const lines = push.lines[source];
    const hit = lines && source === file ? onLines(map, source, lines) : [];
    add(hit.length > 0 ? hit : wholeFile(map, source));
  }
  // A spec the map has no record of: new, or not recording. It runs.
  for (const spec of push.specs)
    if (!map.specs.includes(spec) && SPEC.test(spec)) picked.add(spec);
  const specs = [...picked].filter((s) => push.specs.includes(s)).sort();
  if (push.specs.length > 0 && specs.length >= push.specs.length * MOST)
    return {
      all: true,
      reason: `${String(specs.length)} of ${String(push.specs.length)} specs would run`,
    };
  return { all: false, specs };
}

/**
 * `git diff -U0` to each file's changed lines on the old side: the map's
 * commit's numbering. A pure addition counts as the line before it.
 */
export function changedLines(diff: string): Lines {
  const lines: Lines = {};
  let file: string | null = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("--- ")) {
      file = line === "--- /dev/null" ? null : line.slice(6);
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+/.exec(line);
    if (!hunk || !file) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const range: [number, number] =
      count === 0 ? [start, Math.max(start, 1)] : [start, start + count - 1];
    (lines[file] ??= []).push(range);
  }
  return lines;
}
