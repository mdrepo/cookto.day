import type { CityEdge, CityNode, Repo } from "./city-graph-lib.js";

// Screens as the way in (bun run city): what a person reads on a screen,
// from the i18n keys it and its hooks use, and where it leads, from the
// routes they open. Pure; unit tests in test/city-works.test.ts.

/** The i18n keys a file uses, as `t.key`. */
export function wordKeys(src: string): string[] {
  return [
    ...new Set(
      [...src.matchAll(/\bt\.([a-zA-Z_]\w*)/g)].map((m) => m[1] ?? ""),
    ),
  ];
}

/** The English text for a key: a string, or a plural's "other" form. */
function textOf(en: Record<string, unknown>, key: string): string | undefined {
  const v = en[key];
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "other" in v) {
    const other = v.other;
    return typeof other === "string" ? other : undefined;
  }
  return undefined;
}

/** The pages and steps a file opens, as `open("page")` or `go("step")`. */
export function routesOpened(src: string): string[] {
  return [
    ...new Set(
      [...src.matchAll(/\b(?:open|go)\("([a-z]+)"\)/g)].map((m) => m[1] ?? ""),
    ),
  ];
}

/** A route's feature: most pages share their feature's name. */
const FEATURE_OF: Record<string, string> = {
  list: "shopping",
  where: "onboarding",
  who: "onboarding",
  cooks: "onboarding",
  done: "onboarding",
};

/** A screen and the hooks it imports directly, where its words and routes live. */
function screenSources(
  n: CityNode,
  edges: CityEdge[],
  byId: Map<string, CityNode>,
): string[] {
  const hooks = edges
    .filter((e) => e.k === "import" && e.s === n.id)
    .map((e) => byId.get(e.t))
    .filter(
      (t): t is CityNode => !!t && t.layer === "hooks" && t.group === n.group,
    )
    .map((t) => t.id);
  return [n.id, ...hooks];
}

/**
 * Marks each screen with the words a person reads on it (info.words) and
 * the screens it leads to (info.leads), from its own file and its hooks.
 */
export function wayIn(
  nodes: CityNode[],
  edges: CityEdge[],
  repo: Repo,
  en: Record<string, unknown>,
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const mainScreen = (feature: string) => {
    const screens = nodes.filter(
      (n) => n.layer === "screens" && n.group === feature,
    );
    return screens.find((n) => n.label.endsWith("Screen")) ?? screens[0];
  };
  for (const n of nodes) {
    if (n.layer !== "screens" || n.group === "app shell") continue;
    const sources = screenSources(n, edges, byId).map((id) => repo.read(id));
    const keys = [...new Set(sources.flatMap(wordKeys))];
    const words = keys.flatMap((k) => {
      const text = textOf(en, k);
      return text ? [{ k, text }] : [];
    });
    if (words.length) n.info.words = words;
    const leads = [...new Set(sources.flatMap(routesOpened))]
      .map((r) => mainScreen(FEATURE_OF[r] ?? r))
      .filter((t): t is CityNode => !!t && t.id !== n.id)
      .map((t) => t.id);
    if (leads.length) n.info.leads = [...new Set(leads)];
  }
}
