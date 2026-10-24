import { basename } from "node:path";
import { citedAdrs } from "./city-book-lib.js";
import type { CityNode, Repo } from "./city-graph-lib.js";
import { limitFor } from "../../tooling/scripts/file-size-lib.js";

// The city's gaps (bun run city): what the repo is missing, each pinned to
// the buildings it is about. Pure, like city-graph-lib.ts; unit tests in
// test/city-notices.test.ts. city-notices-lib.ts puts the notices together.

export interface NoticeItem {
  text: string;
  /** The buildings this is about, as node ids. */
  ids?: string[];
  /** A repo file to open when it isn't a building (a spec, the i18n). */
  file?: string;
  line?: number;
  /** A sentence to hand to an agent or file as an issue (city-hall-lib). */
  ask?: string;
}
export interface Notice {
  id: string;
  kind: "gap" | "copy" | "watch";
  title: string;
  /** What it means and what to do, in plain words. */
  why: string;
  items: NoticeItem[];
}
/** A rule from AGENTS.md and what enforces it. */
export interface Rule {
  title: string;
  enforced: string;
  /** False when the only enforcement is "the owner reads it". */
  guarded: boolean;
  /** The ADRs the rule cites, by number. */
  adrs: string[];
}
/** An e2e test file: a walk through the streets in a person's words. */
export interface Walk {
  file: string;
  name: string;
  specs: string[];
  tests: number;
  /** Tests marked test.fail(): known bugs, cordoned off. */
  bugs: number;
}

/** The rules in AGENTS.md's "Rules" section, each with its enforcer. */
export function rules(agents: string): Rule[] {
  const section = /## Rules[\s\S]*?(?=\n## )/.exec(agents)?.[0] ?? "";
  return section
    .split("\n")
    .filter((line) => line.startsWith("- **"))
    .map((line) => {
      const title = /\*\*([^*]+)\*\*/.exec(line)?.[1] ?? line;
      const enforcers = [...line.matchAll(/\*\(([^)]*)\)\*/g)];
      const enforced = enforcers[enforcers.length - 1]?.[1] ?? "";
      return {
        title: title.replace(/[:.]$/, ""),
        enforced,
        guarded: !/owner reads it/.test(enforced),
        adrs: citedAdrs(line),
      };
    });
}

/** Every e2e spec file, with the specs it cites and how many tests it holds. */
export function walks(repo: Repo): Walk[] {
  return repo.files
    .filter((f) => /^(apps|packages)\/[^/]+\/e2e\/.*\.spec\.ts$/.test(f))
    .map((file) => {
      const src = repo.read(file);
      return {
        file,
        name: basename(file, ".spec.ts").replace(/-/g, " "),
        specs: [
          ...new Set([...src.matchAll(/specs\/(\d+)/g)].map((m) => m[1] ?? "")),
        ],
        tests: (src.match(/\btest(?:\.fail)?\(/g) ?? []).length,
        bugs: (src.match(/\btest\.fail\(/g) ?? []).length,
      };
    });
}

const isScreen = (n: CityNode) =>
  n.layer === "screens" && n.group !== "app shell";
const specsOf = (n: CityNode): string[] =>
  ((n.info.specs as { n: string }[] | undefined) ?? []).map((s) => s.n);

/** Files within 15% of their 150 or 300 line limit. */
export function nearCap(nodes: CityNode[]): NoticeItem[] {
  return nodes.flatMap((n) => {
    if (!n.info.path) return [];
    const limit = limitFor(n.id);
    if (limit === null || n.lines < limit * 0.85) return [];
    return [
      {
        text: `${n.label} is at ${n.lines} of ${limit} lines${n.lines > limit ? ": over the law" : ""}`,
        ids: [n.id],
      },
    ];
  });
}

/** A dish that needs a food no pack stocks. */
export function shelves(nodes: CityNode[]): NoticeItem[] {
  const foods = new Set(
    nodes.filter((n) => n.layer === "ingredients").map((n) => n.id),
  );
  return nodes.flatMap((n) => {
    if (n.layer !== "dishes") return [];
    const missing = ((n.info.needs as string[] | undefined) ?? []).filter(
      (f) => !foods.has(`ing:${f}`),
    );
    if (!missing.length) return [];
    return [
      {
        text: `${n.label} needs ${missing.join(", ")}, which no warehouse stocks`,
        ids: [n.id],
      },
    ];
  });
}

/** Screens no walk reaches (decorate() in city-watch-lib.ts says which do). */
export function walkGaps(nodes: CityNode[]): NoticeItem[] {
  return nodes.flatMap((n) => {
    if (!isScreen(n) || n.info.walks) return [];
    const specs = specsOf(n);
    return [
      {
        text: specs.length
          ? `${n.label} follows spec ${specs.join(", ")}, which no walk checks`
          : `${n.label} cites no spec, and no walk is named after it`,
        ids: [n.id],
      },
    ];
  });
}

/** The specs any test cites, unit or e2e: specs/NNN in a test or spec file. */
export function inspected(repo: Repo): Set<string> {
  const cited = new Set<string>();
  for (const f of repo.files)
    if (/\/(test|e2e)\/.*\.(test|spec)\.ts$/.test(f))
      for (const m of repo.read(f).matchAll(/specs\/(\d+)/g))
        cited.add(m[1] ?? "");
  return cited;
}

/** Specs no test cites, with the buildings that follow them. */
export function permitGaps(repo: Repo, nodes: CityNode[]): NoticeItem[] {
  const cited = inspected(repo);
  return repo.files.flatMap((file) => {
    const m = /^specs\/(\d+)-(.*)\.md$/.exec(file);
    if (!m?.[1] || cited.has(m[1])) return [];
    const n = m[1];
    const ids = nodes.filter((x) => specsOf(x).includes(n)).map((x) => x.id);
    const name = (m[2] ?? "").replace(/-/g, " ");
    return [
      {
        text: `Spec ${n}, ${name}: no test cites it${ids.length ? "" : ", and no building does either"}`,
        ids,
        file,
      },
    ];
  });
}

/** The rules only the owner reads, with the files a rule names. */
export function beats(allRules: Rule[], nodes: CityNode[]): NoticeItem[] {
  return allRules
    .filter((r) => !r.guarded)
    .map((r) => ({
      text: `${r.title}: ${r.enforced}`,
      ids: r.enforced.includes("apps/web/src/*.ts")
        ? nodes
            .filter((n) => /^apps\/web\/src\/[^/]+\.ts$/.test(n.id))
            .map((n) => n.id)
        : [],
    }));
}
