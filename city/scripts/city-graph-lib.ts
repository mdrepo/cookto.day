import { basename } from "node:path";
import {
  declarations,
  importSpecs,
  isCode,
  layerOf,
  resolveImport,
  shortPath,
} from "./city-code-lib.js";

// The city's graph (bun run city): a building per code file, dish and food,
// and a road per import, recipe line and pack bundle. Pure: the repo comes in
// as a list of paths, a reader and the parsed git history, so tests pass a
// made-up one. The page in tooling/city/ reads the shape written here.

export interface Commit {
  h: string;
  d: string;
  m: string;
}
export interface History {
  commits: Commit[];
  /** Commit index that first added each path. */
  added: Map<string, number>;
  /** Commit index that last touched each path. */
  last: Map<string, number>;
  /** How many commits touched each path. */
  churn: Map<string, number>;
}

/** Parses `git log --reverse --format=@@%h|%ad|%s --date=short --name-status`. */
export function parseHistory(log: string): History {
  const history: History = {
    commits: [],
    added: new Map(),
    last: new Map(),
    churn: new Map(),
  };
  for (const block of log.split("@@").slice(1)) {
    const [head = "", ...rest] = block.trim().split("\n");
    const [h = "", d = "", ...m] = head.split("|");
    const i = history.commits.push({ h, d, m: m.join("|") }) - 1;
    for (const line of rest) {
      const parts = line.split("\t");
      const file = parts[parts.length - 1];
      if (parts.length < 2 || !file) continue;
      if (!history.added.has(file) && parts[0] !== "D")
        history.added.set(file, i);
      history.last.set(file, i);
      history.churn.set(file, (history.churn.get(file) ?? 0) + 1);
    }
  }
  return history;
}

export interface CityNode {
  id: string;
  label: string;
  layer: string;
  group: string;
  /** Lines for code; ingredients for a dish; 1 for a food. */
  lines: number;
  added: number;
  churn: number;
  last: number;
  info: Record<string, unknown>;
}
export interface CityEdge {
  s: string;
  t: string;
  k: "import" | "recipe" | "served" | "bundle";
}
export interface Repo {
  files: string[];
  read: (path: string) => string;
  history: History;
}

/** "@cookto/x" and its subpaths, from each package's exports, as repo paths. */
function packageExports(repo: Repo): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of repo.files) {
    const m = /^packages\/([^/]+)\/package\.json$/.exec(file);
    if (!m) continue;
    const pkg = JSON.parse(repo.read(file)) as {
      exports?: Record<string, string>;
    };
    for (const [key, target] of Object.entries(pkg.exports ?? {})) {
      const sub = key === "." ? "" : key.slice(1);
      map[`@cookto/${m[1]}${sub}`] =
        `packages/${m[1]}/${target.replace(/^\.\//, "")}`;
    }
  }
  return map;
}

interface Named {
  text: string;
  lang?: string;
}
interface Food {
  wikidata?: string;
  label?: string;
  keeps?: { days: number; in: string };
  names?: Named[];
}
interface Dish {
  slots?: string[];
  ingredients?: Record<string, unknown>;
  servedWith?: string[];
  steps?: string[];
  note?: string;
}

/** The city as it's built up: buildings by id, roads, and each file's dates. */
interface City {
  nodes: Map<string, CityNode>;
  edges: CityEdge[];
  when: (f: string) => { added: number; churn: number; last: number };
}

/** A building per code file, and a road per import between two of them. */
function codeBuildings(repo: Repo, { nodes, edges, when }: City): void {
  const specFiles = new Map<string, string>();
  for (const f of repo.files) {
    const m = /^specs\/(\d+)-.*\.md$/.exec(f);
    if (m?.[1]) specFiles.set(m[1], f);
  }
  const code = repo.files.filter(isCode);
  for (const f of code) {
    const src = repo.read(f);
    const [layer, group] = layerOf(f);
    const specs = [
      ...new Set([...src.matchAll(/specs\/(\d+)/g)].map((m) => m[1] ?? "")),
    ]
      .map((n) => ({ n, file: specFiles.get(n) }))
      .filter((s) => s.file);
    nodes.set(f, {
      id: f,
      label: basename(f).replace(/\.tsx?$/, ""),
      layer,
      group,
      lines: src.split("\n").length,
      ...when(f),
      info: { path: shortPath(f), fns: declarations(src), specs },
    });
  }
  const pkgExports = packageExports(repo);
  const seen = new Set<string>();
  for (const f of code) {
    for (const spec of importSpecs(repo.read(f))) {
      if (spec.includes("/i18n/")) continue;
      const t = resolveImport(f, spec, (p) => nodes.has(p), pkgExports);
      if (!t || t === f || !nodes.has(t) || seen.has(`${f}>${t}`)) continue;
      seen.add(`${f}>${t}`);
      edges.push({ s: f, t, k: "import" });
    }
  }
}

/** A building per food, in packs/ingredients/. */
function foodBuildings(repo: Repo, { nodes, when }: City): void {
  for (const f of repo.files.filter((x) =>
    /^packs\/ingredients\/[^/]+\.json$/.test(x),
  )) {
    const food = JSON.parse(repo.read(f)) as Food;
    const name = (lang: string) =>
      food.names?.find((n) => n.lang === lang)?.text;
    nodes.set(`ing:${basename(f, ".json")}`, {
      id: `ing:${basename(f, ".json")}`,
      label: name("en") ?? food.label ?? basename(f, ".json"),
      layer: "ingredients",
      group: food.keeps?.in ?? "cupboard",
      lines: 1,
      ...when(f),
      info: {
        file: f,
        keeps: food.keeps
          ? `${food.keeps.days} days in the ${food.keeps.in}`
          : undefined,
        hi: name("hi"),
        wikidata: food.wikidata,
      },
    });
  }
}

/** A building per dish, with a road to each food it needs, its sides, and its pack's bundle. */
function dishBuildings(repo: Repo, { nodes, edges, when }: City): void {
  const packs = repo.files.flatMap((f) => {
    const m = /^packs\/([^/]+)\/pack\.json$/.exec(f);
    return m?.[1] ? [m[1]] : [];
  });
  const served: [string, string][] = [];
  for (const p of packs) {
    const wordsFile = `packs/${p}/words/en.json`;
    const words = repo.files.includes(wordsFile)
      ? (JSON.parse(repo.read(wordsFile)) as {
          dishes?: Record<string, string>;
        })
      : {};
    const bundle = `packages/data/src/packs/${p}.ts`;
    for (const f of repo.files.filter(
      (x) => x.startsWith(`packs/${p}/dishes/`) && x.endsWith(".json"),
    )) {
      const dish = JSON.parse(repo.read(f)) as Dish;
      const slug = basename(f, ".json");
      const id = `dish:${p}/${slug}`;
      const ingredients = Object.keys(dish.ingredients ?? {});
      nodes.set(id, {
        id,
        label: words.dishes?.[slug] ?? slug,
        layer: "dishes",
        group: p,
        lines: ingredients.length,
        ...when(f),
        info: {
          file: f,
          slots: dish.slots,
          servedWith: dish.servedWith,
          steps: dish.steps?.length,
          ingredients: ingredients.length,
          needs: ingredients,
          note: dish.note,
        },
      });
      for (const ing of ingredients)
        if (nodes.has(`ing:${ing}`))
          edges.push({ s: id, t: `ing:${ing}`, k: "recipe" });
      for (const side of dish.servedWith ?? []) served.push([id, side]);
      if (nodes.has(bundle)) edges.push({ s: bundle, t: id, k: "bundle" });
    }
  }
  // A side may be a dish in any pack, scanned before or after.
  for (const [id, side] of served)
    for (const p of packs)
      if (nodes.has(`dish:${p}/${side}`))
        edges.push({ s: id, t: `dish:${p}/${side}`, k: "served" });
}

export function buildGraph(repo: Repo): {
  nodes: CityNode[];
  edges: CityEdge[];
} {
  const { history } = repo;
  const city: City = {
    nodes: new Map(),
    edges: [],
    when: (f) => ({
      added: history.added.get(f) ?? 0,
      churn: history.churn.get(f) ?? 1,
      last: history.last.get(f) ?? 0,
    }),
  };
  codeBuildings(repo, city);
  foodBuildings(repo, city);
  dishBuildings(repo, city);
  return { nodes: [...city.nodes.values()], edges: city.edges };
}
