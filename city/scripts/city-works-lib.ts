import { basename } from "node:path";
import type { Declaration } from "./city-code-lib.js";
import type { NoticeItem } from "./city-gaps-lib.js";
import type { CityEdge, CityNode, Repo } from "./city-graph-lib.js";

// The city's works (bun run city): the buildings nobody inspects, the doors
// cut only for the inspectors, the dead ends, the doors of each package and
// the roads that don't use them, and the topics that run through every
// layer. Pure; unit tests in test/city-works.test.ts.

const TEST = /\/(test|e2e)\/.*\.ts$/;
const INSPECTED_LAYERS = new Set(["engine", "usecases", "data", "api"]);

/** The works with no unit test file of their own. */
export function uninspected(nodes: CityNode[], files: string[]): NoticeItem[] {
  const byWorkspace = new Map<string, string[]>();
  for (const f of files) {
    const m = /^((?:apps|packages|db)\/[^/]+)\/test\/(.*)\.test\.ts$/.exec(f);
    if (m?.[1] && m[2])
      byWorkspace.set(m[1], [...(byWorkspace.get(m[1]) ?? []), basename(m[2])]);
  }
  // settings-beans.test.ts covers settings.ts; telegram.test.ts covers telegram-update.ts.
  const covers = (t: string, s: string) =>
    !!s &&
    (t === s ||
      t.startsWith(`${s}-`) ||
      (s.length >= 4 && t.startsWith(s)) ||
      (t.length >= 4 && s.startsWith(t)));
  return nodes.flatMap((n) => {
    if (!n.info.path || !INSPECTED_LAYERS.has(n.layer)) return [];
    if (n.group === "IndexedDB adapter" || n.group === "testing") return [];
    const m = /^((?:apps|packages)\/[^/]+)\/src\/(.*)\.tsx?$/.exec(n.id);
    if (!m?.[1] || !m[2]) return [];
    const name = basename(m[2]);
    if (name === "index") return [];
    const dir = m[2].includes("/") ? (m[2].split("/")[0] ?? "") : "";
    const tests = byWorkspace.get(m[1]) ?? [];
    if (tests.some((t) => covers(t, name) || covers(t, dir))) return [];
    return [
      {
        text: `${n.label} has no test file of its own in ${m[1]}/test`,
        ids: [n.id],
      },
    ];
  });
}

/** The names a file imports, or re-exports from another file. */
export function importedNames(src: string): string[] {
  const names: string[] = [];
  for (const m of src.matchAll(
    /(?:import|export)\s*(?:type\s*)?\{([^}]*)\}\s*from/g,
  ))
    for (const part of (m[1] ?? "").split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .replace(/\s+as\s+.*$/, "");
      if (name) names.push(name);
    }
  for (const m of src.matchAll(/import\s+(\w+)\s*(?:,|from)/g))
    if (m[1] && m[1] !== "type") names.push(m[1]);
  return names;
}

const ENTRY = /(\/main\.tsx|\/index\.ts|\/page\.tsx|\.kit\.tsx)$/;

/** Exported names that only test files import: doors cut for the inspectors. */
export function onlyInspectors(nodes: CityNode[], repo: Repo): NoticeItem[] {
  const street = new Set<string>();
  const inspectors = new Set<string>();
  for (const f of repo.files) {
    if (!/\.tsx?$/.test(f) || f.endsWith(".d.ts")) continue;
    const into = TEST.test(f) ? inspectors : street;
    for (const name of importedNames(repo.read(f))) into.add(name);
  }
  return nodes.flatMap((n) => {
    if (!n.info.path || ENTRY.test(n.id)) return [];
    const src = repo.read(n.id);
    const names = ((n.info.fns as Declaration[] | undefined) ?? [])
      .filter((f) => f.exported && f.kind !== "re-export")
      .map((f) => f.name)
      .filter((name) => !street.has(name) && inspectors.has(name))
      .filter(
        (name) =>
          (src.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length <= 1,
      );
    if (!names.length) return [];
    return [
      {
        text: `${n.label} exports ${names.join(", ")} for tests only`,
        ids: [n.id],
      },
    ];
  });
}

/** Buildings with no roads in or out: an entry point, or forgotten. */
export function deadEnds(nodes: CityNode[], edges: CityEdge[]): NoticeItem[] {
  const linked = new Set(edges.flatMap((e) => [e.s, e.t]));
  return nodes
    .filter((n) => n.info.path && !linked.has(n.id))
    .map((n) => ({ text: `${n.label} has no roads in or out`, ids: [n.id] }));
}

const packageOf = (id: string) =>
  /^(?:packages|apps)\/([^/]+)\//.exec(id)?.[1] ?? "";

/** Marks each file a package's exports open onto as a door, by its "@cookto/x" name. */
export function markDoors(
  nodes: CityNode[],
  doors: Record<string, string>,
): void {
  for (const n of nodes) {
    const names = Object.entries(doors)
      .filter(([, file]) => file === n.id)
      .map(([name]) => name);
    if (names.length) n.info.door = names;
  }
}

/** Roads from outside a package that reach a file that is not one of its doors. */
export function trespasses(
  nodes: CityNode[],
  edges: CityEdge[],
  doors: Record<string, string>,
): NoticeItem[] {
  const doorFiles = new Set(Object.values(doors));
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  return edges
    .filter(
      (e) =>
        e.k === "import" &&
        e.t.startsWith("packages/") &&
        packageOf(e.s) !== packageOf(e.t) &&
        !doorFiles.has(e.t),
    )
    .map((e) => ({
      text: `${label.get(e.s) ?? e.s} enters ${packageOf(e.t)} at ${label.get(e.t) ?? e.t}, not through a door`,
      ids: [e.s, e.t],
    }));
}

export interface Topic {
  name: string;
  ids: string[];
  layers: string[];
}

/** A building's topic: its name without use, Screen or hyphens, in lower case. */
export function topicOf(label: string): string {
  return label
    .replace(/^use(?=[A-Z])/, "")
    .replace(/(Screen|Step)$/, "")
    .replace(/[-_.]/g, "")
    .toLowerCase();
}

/** One name followed through the layers: the same topic in two or more districts. */
export function topics(nodes: CityNode[]): Topic[] {
  const by = new Map<string, Topic>();
  for (const n of nodes) {
    if (!n.info.path) continue;
    const name = topicOf(n.label);
    if (name === "index" || name === "main" || name.length < 3) continue;
    const t = by.get(name) ?? { name, ids: [], layers: [] };
    t.ids.push(n.id);
    if (!t.layers.includes(n.layer)) t.layers.push(n.layer);
    by.set(name, t);
  }
  return [...by.values()]
    .filter((t) => t.layers.length > 1)
    .sort(
      (a, b) =>
        b.layers.length - a.layers.length || b.ids.length - a.ids.length,
    );
}
