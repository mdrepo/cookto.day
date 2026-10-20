import { importSpecs } from "./city-code-lib.js";
import type { NoticeItem, Walk } from "./city-gaps-lib.js";
import type { CityEdge, CityNode, Repo } from "./city-graph-lib.js";
import { isOwned, ownedPaths } from "../../tooling/scripts/codeowners.js";

// The city's watch list (bun run city): not gaps, but what to keep an eye
// on: junctions a change spreads through, goods from abroad, and the extra
// facts on a building's card (listed, walked by, brings in). Pure; unit
// tests in test/city-notices.test.ts.

const OURS = /^(\.|@cookto\/|node:|bun:|cloudflare:)/;
/** An npm package name: lower case, no spaces; a scope and a name, or a name. */
const PACKAGE = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

/** The outside packages a file imports, by package name. */
export function abroad(src: string): string[] {
  const names = importSpecs(src)
    .filter((s) => !OURS.test(s))
    .map((s) =>
      (s.startsWith("@")
        ? s.split("/").slice(0, 2)
        : s.split("/").slice(0, 1)
      ).join("/"),
    )
    .filter((s) => PACKAGE.test(s));
  return [...new Set(names)];
}

/**
 * Whether a walk reaches a building: it cites one of the building's specs,
 * or it is named after the screen ("cook now" for CookNow) or its feature.
 */
export function reaches(walk: Walk, n: CityNode): boolean {
  const specs = ((n.info.specs as { n: string }[] | undefined) ?? []).map(
    (s) => s.n,
  );
  if (walk.specs.some((s) => specs.includes(s))) return true;
  if (n.layer !== "screens") return false;
  const name = walk.name.replace(/ /g, "");
  return name === n.label.toLowerCase() || name === n.group.toLowerCase();
}

/** Marks each building listed (CODEOWNERS), walked by (e2e) and bringing in from abroad. */
export function decorate(
  nodes: CityNode[],
  repo: Repo,
  allWalks: Walk[],
): void {
  const owned = repo.files.includes(".github/CODEOWNERS")
    ? ownedPaths(repo.read(".github/CODEOWNERS"))
    : [];
  for (const n of nodes) {
    const file = (n.info.file as string | undefined) ?? n.id;
    n.info.listed = isOwned(file, owned);
    const walked = allWalks.filter((w) => reaches(w, n)).map((w) => w.name);
    if (walked.length) n.info.walks = walked;
    if (n.info.path) n.info.abroad = abroad(repo.read(n.id));
  }
}

/** Each outside package and the buildings that use it, against the guest list. */
export function guests(nodes: CityNode[], allowlist: string): NoticeItem[] {
  const list = JSON.parse(allowlist) as Record<string, Record<string, unknown>>;
  const invited = new Set([
    ...Object.keys(list.dependencies ?? {}),
    ...Object.keys(list.devDependencies ?? {}),
  ]);
  const by = new Map<string, string[]>();
  for (const n of nodes)
    for (const p of (n.info.abroad as string[] | undefined) ?? [])
      by.set(p, [...(by.get(p) ?? []), n.id]);
  return [...by.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([pkg, ids]) => ({
      text: `${pkg}: ${ids.length} building${ids.length === 1 ? "" : "s"}${invited.has(pkg) ? "" : " (not on the guest list)"}`,
      ids,
    }));
}

/**
 * The buildings a change spreads through to the most screens, by import
 * roads. The design kit is left out: every screen is built from it.
 */
export function junctions(
  nodes: CityNode[],
  edges: CityEdge[],
  top = 8,
): NoticeItem[] {
  const users = new Map<string, string[]>();
  for (const e of edges)
    if (e.k === "import") users.set(e.t, [...(users.get(e.t) ?? []), e.s]);
  const screen = new Set(
    nodes.filter((n) => n.layer === "screens").map((n) => n.id),
  );
  const reach = (id: string) => {
    const seen = new Set<string>([id]);
    const q = [id];
    for (let h = 0; h < q.length; h++)
      for (const u of users.get(q[h] ?? "") ?? [])
        if (!seen.has(u)) {
          seen.add(u);
          q.push(u);
        }
    seen.delete(id);
    return {
      screens: [...seen].filter((x) => screen.has(x)).length,
      all: seen.size,
    };
  };
  return nodes
    .filter((n) => !screen.has(n.id) && n.info.path && n.layer !== "ui")
    .map((n) => ({ n, ...reach(n.id) }))
    .filter((r) => r.screens > 0)
    .sort((a, b) => b.screens - a.screens || b.all - a.all)
    .slice(0, top)
    .map(({ n, screens, all }) => ({
      text: `${n.label} reaches ${screens} screen${screens === 1 ? "" : "s"} through ${all} buildings`,
      ids: [n.id],
    }));
}
