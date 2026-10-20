import type { NoticeItem } from "./city-gaps-lib.js";
import type { CityNode, Repo } from "./city-graph-lib.js";

// The city's statute book (bun run city): the ADRs, with their status and
// who cites them, and the proposals, which are ideas not yet law. Pure;
// unit tests in test/city-works.test.ts.

export interface Adr {
  n: string;
  file: string;
  title: string;
  status: string;
  /** The ADRs this one cites, by number. */
  cites: string[];
}
export interface Proposal {
  file: string;
  title: string;
  status: string;
}

/**
 * The ADR numbers a text cites: "ADR 0022", "ADR 0005, 0006", "adr/0022",
 * or a link like "[0019](0019-design-system.md)".
 */
export function citedAdrs(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\bADRs?\s+(\d{4}(?:\s*(?:,|and)\s*\d{4})*)/g))
    for (const n of (m[1] ?? "").match(/\d{4}/g) ?? []) found.add(n);
  for (const m of text.matchAll(/adr\/(\d{4})/g)) found.add(m[1] ?? "");
  for (const m of text.matchAll(/\[(\d{4})\]\(\1-[^)]*\.md\)/g))
    found.add(m[1] ?? "");
  found.delete("");
  return [...found].sort();
}

const title = (src: string) =>
  /^#\s+(?:\d{4}\.\s+)?(.+)$/m.exec(src)?.[1]?.trim() ?? "";
const status = (src: string) =>
  /\*\*Status:\*\*\s*([^\n]+)/.exec(src)?.[1]?.trim() ?? "";

/** Every ADR in docs/adr, by number. */
export function adrs(repo: Repo): Adr[] {
  return repo.files
    .filter((f) => /^docs\/adr\/\d{4}-.*\.md$/.test(f))
    .sort()
    .map((file) => {
      const src = repo.read(file);
      const n = /(\d{4})/.exec(file)?.[1] ?? "";
      return {
        n,
        file,
        title: title(src),
        status: status(src).replace(/\s+by.*$/, ""),
        cites: citedAdrs(src).filter((x) => x !== n),
      };
    });
}

/** The proposals in docs/proposals: planning applications, not yet law. */
export function proposals(repo: Repo): Proposal[] {
  return repo.files
    .filter((f) => /^docs\/proposals\/.*\.md$/.test(f))
    .sort()
    .map((file) => {
      const src = repo.read(file);
      return {
        file,
        title: title(src).replace(/^Proposal:\s*/i, ""),
        status: status(src),
      };
    });
}

/**
 * Accepted ADRs nothing else cites: not the rules, the code, the specs,
 * the proposals, nor another ADR. A decision nobody points at may be
 * forgotten, or may be the ground everything stands on without saying so.
 */
export function uncited(
  all: Adr[],
  nodes: CityNode[],
  repo: Repo,
): NoticeItem[] {
  const cited = new Set<string>();
  for (const a of all) for (const n of a.cites) cited.add(n);
  const texts = repo.files.filter(
    (f) =>
      /^(AGENTS\.md|DESIGN\.md|README\.md|docs\/(?!adr\/).*\.md|specs\/.*\.md)$/.test(
        f,
      ) || nodes.some((n) => n.id === f),
  );
  for (const f of texts) for (const n of citedAdrs(repo.read(f))) cited.add(n);
  return all
    .filter((a) => a.status.startsWith("Accepted") && !cited.has(a.n))
    .map((a) => ({
      text: `ADR ${a.n}, ${a.title}: nothing cites it`,
      file: a.file,
    }));
}
