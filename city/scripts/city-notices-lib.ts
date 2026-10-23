import {
  adrs,
  proposals,
  uncited,
  type Adr,
  type Proposal,
} from "./city-book-lib.js";
import { overTheWall, type Gate } from "./city-borders-lib.js";
import { copies, dishTwins, signs, twins } from "./city-dups-lib.js";
import {
  beats,
  nearCap,
  permitGaps,
  rules,
  shelves,
  walkGaps,
  walks,
  type Notice,
  type NoticeItem,
  type Rule,
  type Walk,
} from "./city-gaps-lib.js";
import {
  packageExports,
  type CityEdge,
  type CityNode,
  type Repo,
} from "./city-graph-lib.js";
import { conduct, withAsks, type HallRule } from "./city-hall-lib.js";
import { gates } from "./city-port-lib.js";
import { wayIn } from "./city-screens-lib.js";
import { decorate, guests, junctions } from "./city-watch-lib.js";
import {
  deadEnds,
  markDoors,
  onlyInspectors,
  topics,
  trespasses,
  uninspected,
  type Topic,
} from "./city-works-lib.js";

// The city's notice board (bun run city): every gap, copy and thing to watch
// the scan found, in the order worth acting on, each with its ask. The page
// lists them, pins each to its buildings, and takes the first few as "What
// now". The walls and gates, and the town hall's rules, come out of it too.

export interface Board {
  notices: Notice[];
  rules: HallRule[];
  gates: Gate[];
  walks: Walk[];
  adrs: Adr[];
  proposals: Proposal[];
  topics: Topic[];
}

const EN = "apps/web/src/i18n/en.ts";
const ALLOWLIST = "dependency-allowlist.json";

const readOr = (repo: Repo, file: string) =>
  repo.files.includes(file) ? repo.read(file) : "";

/** The gaps: what the repo is missing, in the order worth acting on. */
function gaps(
  nodes: CityNode[],
  repo: Repo,
  allGates: Gate[],
  doors: NoticeItem[],
): Notice[] {
  return [
    {
      id: "wall",
      kind: "gap",
      title: "Roads over a wall",
      why: "A wall stands where an ADR governs a place, and its gate is the one way through. A road or file that goes over the wall instead breaks the ADR.",
      items: overTheWall(allGates.filter((g) => g.id !== "door")),
    },
    {
      id: "door",
      kind: "gap",
      title: "Roads not through a door",
      why: "A package's doors are the files its package.json exports name. A road from outside that enters anywhere else bypasses the contract (ADR 0016).",
      items: doors,
    },
    {
      id: "shelf",
      kind: "gap",
      title: "Empty shelves",
      why: "A dish calls for a food no pack stocks, so the app can never say it has everything for it. Add the food to packs/ingredients.",
      items: shelves(nodes),
    },
    {
      id: "walk",
      kind: "gap",
      title: "Screens no walk reaches",
      why: "A walk is an e2e test, named in a person's words; it reaches a screen when it cites the screen's spec or is named after the screen or its feature. A screen none reaches can break without anyone noticing. Cite its spec, or write the walk.",
      items: walkGaps(nodes),
    },
    {
      id: "permit",
      kind: "gap",
      title: "Permits without a walk",
      why: "A spec is a building permit. One no test cites, unit or e2e, was approved but never inspected.",
      items: permitGaps(repo, nodes),
    },
    {
      id: "cap",
      kind: "gap",
      title: "Near the zoning cap",
      why: "Within 15% of the 150 or 300 line limit. The next change here will need a split; plan it rather than squeeze it.",
      items: nearCap(nodes),
    },
    {
      id: "inspect",
      kind: "gap",
      title: "Uninspected buildings",
      why: "An engine, use case, data or API file with no unit test file of its own. Walks cover the screens; nothing covers these.",
      items: uninspected(nodes, repo.files),
    },
  ];
}

/** The copies: the same thing written twice. */
function copiesTwice(nodes: CityNode[], repo: Repo): Notice[] {
  return [
    {
      id: "copy",
      kind: "copy",
      title: "The same lines twice",
      why: "What bun run copies finds: six or more lines shared by two files. Move them to one place the two can share.",
      items: copies(nodes, repo),
    },
    {
      id: "twin",
      kind: "copy",
      title: "Twins",
      why: "The same name declared in two or more buildings. Sometimes two jobs share a name; often it is one job written twice.",
      items: twins(nodes),
    },
    {
      id: "sign",
      kind: "copy",
      title: "One sign, two keys",
      why: "The same English text under two i18n keys means it was translated twice, and can drift apart.",
      items: signs(readOr(repo, EN), EN),
    },
    {
      id: "dish",
      kind: "copy",
      title: "The same dish twice",
      why: "One slug or one ingredient set in two packs.",
      items: dishTwins(nodes),
    },
    {
      id: "testdoor",
      kind: "copy",
      title: "Offered only to the inspectors",
      why: "An exported function that only test files import: a door cut for the inspectors, not for the street. Test it through what the street uses, or stop exporting it.",
      items: onlyInspectors(nodes, repo),
    },
  ];
}

/** The watch list: not wrong, but worth an eye. */
function watchList(
  nodes: CityNode[],
  edges: CityEdge[],
  repo: Repo,
  allRules: Rule[],
  allAdrs: Adr[],
): Notice[] {
  return [
    {
      id: "deadend",
      kind: "watch",
      title: "Dead ends",
      why: "A building with no roads in or out: an entry point the app starts from, or something forgotten.",
      items: deadEnds(nodes, edges),
    },
    {
      id: "adr",
      kind: "watch",
      title: "Decisions nothing cites",
      why: "An accepted ADR that no rule, code file, spec, proposal or other ADR points at. Either the ground everything stands on, or forgotten.",
      items: uncited(allAdrs, nodes, repo),
    },
    {
      id: "beat",
      kind: "watch",
      title: "Beats only you walk",
      why: "Rules in AGENTS.md that no script checks: the owner reads it. These hold only as long as you keep reading.",
      items: beats(allRules, nodes),
    },
    {
      id: "junction",
      kind: "watch",
      title: "Junctions",
      why: "The buildings a change spreads through to the most screens, leaving out the design kit, which every screen is built from. Touch these with care, and with a walk.",
      items: junctions(nodes, edges),
    },
    {
      id: "abroad",
      kind: "watch",
      title: "Goods from abroad",
      why: "Every outside package and the buildings that bring it in, checked against the guest list in dependency-allowlist.json.",
      items: guests(nodes, readOr(repo, ALLOWLIST) || "{}"),
    },
  ];
}

/**
 * Builds the board and marks each building with its extra facts. `en` is
 * the English words (apps/web/src/i18n/en.ts), for what each screen shows.
 */
export function board(
  graph: { nodes: CityNode[]; edges: CityEdge[] },
  repo: Repo,
  en: Record<string, unknown> = {},
): Board {
  const { nodes, edges } = graph;
  const allWalks = walks(repo);
  const allRules = rules(readOr(repo, "AGENTS.md"));
  const allAdrs = adrs(repo);
  const doors = packageExports(repo);
  decorate(nodes, repo, allWalks);
  markDoors(nodes, doors);
  wayIn(nodes, edges, repo, en);
  const doorless = trespasses(nodes, edges, doors);
  const allowlist = JSON.parse(readOr(repo, ALLOWLIST) || "{}") as {
    dependencies?: Record<string, unknown>;
  };
  const allGates = gates({
    nodes,
    edges,
    repo,
    doors,
    shipping: Object.keys(allowlist.dependencies ?? {}),
    trespasses: doorless,
  });
  const notices = withAsks([
    ...gaps(nodes, repo, allGates, doorless),
    ...copiesTwice(nodes, repo),
    ...watchList(nodes, edges, repo, allRules, allAdrs),
  ]);
  return {
    notices,
    rules: conduct(allRules, allGates, notices),
    gates: allGates,
    walks: allWalks,
    adrs: allAdrs,
    proposals: proposals(repo),
    topics: topics(nodes),
  };
}
