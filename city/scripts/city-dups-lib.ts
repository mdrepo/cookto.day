import type { Declaration } from "./city-code-lib.js";
import type { NoticeItem } from "./city-gaps-lib.js";
import type { CityNode, Repo } from "./city-graph-lib.js";
import { findCopies } from "../../tooling/scripts/copies-lib.js";

// The city's copies (bun run city): the same thing written twice, pinned to
// the buildings it's in. Pure; unit tests in test/city-notices.test.ts.

/** The pairs `bun run copies` reports, as notices: shipped code, not packs. */
export function copies(nodes: CityNode[], repo: Repo): NoticeItem[] {
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  return findCopies(
    nodes
      .filter((n) => n.info.path && n.layer !== "packs")
      .map((n) => ({ path: n.id, text: repo.read(n.id) })),
  ).map(({ a, b }) => ({
    text: `${label.get(a.file) ?? a.file} and ${label.get(b.file) ?? b.file} share 6+ lines (from lines ${a.at} and ${b.at})`,
    ids: [a.file, b.file],
    file: a.file,
    line: a.at,
  }));
}

const NOT_TWINS = new Set(["default", "main", "index", "render"]);

/** The same function, hook, part or class name declared in two or more buildings. */
export function twins(nodes: CityNode[]): NoticeItem[] {
  const by = new Map<string, { ids: string[]; kind: string }>();
  for (const n of nodes)
    for (const f of (n.info.fns as Declaration[] | undefined) ?? []) {
      if (f.kind === "re-export" || f.kind === "value" || NOT_TWINS.has(f.name))
        continue;
      const e = by.get(f.name) ?? { ids: [], kind: f.kind };
      if (!e.ids.includes(n.id)) e.ids.push(n.id);
      by.set(f.name, e);
    }
  return [...by.entries()]
    .filter(([, e]) => e.ids.length > 1)
    .sort(
      (a, b) => b[1].ids.length - a[1].ids.length || a[0].localeCompare(b[0]),
    )
    .map(([name, e]) => ({
      text: `${name}() is declared in ${e.ids.length} buildings`,
      ids: e.ids,
    }));
}

/** The same English text under two or more i18n keys. */
export function signs(enSource: string, file: string): NoticeItem[] {
  const by = new Map<string, { keys: string[]; line: number }>();
  enSource.split("\n").forEach((line, i) => {
    const m = /^\s+(\w+):\s*"((?:[^"\\]|\\.)*)",?\s*$/.exec(line);
    if (!m?.[1] || !m[2] || m[2].length < 3) return;
    const e = by.get(m[2]) ?? { keys: [], line: i + 1 };
    e.keys.push(m[1]);
    by.set(m[2], e);
  });
  return [...by.entries()]
    .filter(([, e]) => e.keys.length > 1)
    .map(([text, e]) => ({
      text: `“${text}” is said under ${e.keys.length} keys: ${e.keys.join(", ")}`,
      file,
      line: e.line,
    }));
}

/** The same dish in two packs: one slug, or one set of ingredients. */
export function dishTwins(nodes: CityNode[]): NoticeItem[] {
  const dishes = nodes.filter((n) => n.layer === "dishes");
  const bySlug = new Map<string, string[]>();
  const byNeeds = new Map<string, string[]>();
  for (const d of dishes) {
    const slug = d.id.replace(/^dish:[^/]+\//, "");
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), d.id]);
    const needs = ((d.info.needs as string[] | undefined) ?? []).slice().sort();
    if (needs.length >= 3) {
      const key = needs.join(",");
      byNeeds.set(key, [...(byNeeds.get(key) ?? []), d.id]);
    }
  }
  const label = (id: string) => dishes.find((d) => d.id === id)?.label ?? id;
  const items: NoticeItem[] = [];
  for (const [slug, ids] of bySlug)
    if (ids.length > 1)
      items.push({ text: `${slug} is a dish in ${ids.length} packs`, ids });
  for (const ids of byNeeds.values())
    if (ids.length > 1)
      items.push({
        text: `${ids.map(label).join(" and ")} use the same ingredients`,
        ids,
      });
  return items;
}
