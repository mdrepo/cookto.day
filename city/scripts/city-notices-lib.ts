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
  type Rule,
  type Walk,
} from "./city-gaps-lib.js";
import type { CityEdge, CityNode, Repo } from "./city-graph-lib.js";
import { decorate, guests, junctions } from "./city-watch-lib.js";

// The city's notice board (bun run city): every gap, copy and thing to watch
// the scan found, in the order worth acting on. The page lists them, pins
// each to its buildings, and takes the first few as "What now".

export interface Board {
  notices: Notice[];
  rules: Rule[];
  walks: Walk[];
}

const EN = "apps/web/src/i18n/en.ts";
const ALLOWLIST = "dependency-allowlist.json";

const readOr = (repo: Repo, file: string) =>
  repo.files.includes(file) ? repo.read(file) : "";

/** The gaps: what the repo is missing, in the order worth acting on. */
function gaps(nodes: CityNode[], repo: Repo): Notice[] {
  return [
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
  ];
}

/** The watch list: not wrong, but worth an eye. */
function watchList(
  nodes: CityNode[],
  edges: CityEdge[],
  repo: Repo,
  allRules: Rule[],
): Notice[] {
  return [
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

/** Builds the board and marks each building with its extra facts. */
export function board(
  graph: { nodes: CityNode[]; edges: CityEdge[] },
  repo: Repo,
): Board {
  const { nodes, edges } = graph;
  const allWalks = walks(repo);
  const allRules = rules(readOr(repo, "AGENTS.md"));
  decorate(nodes, repo, allWalks);
  return {
    notices: [
      ...gaps(nodes, repo),
      ...copiesTwice(nodes, repo),
      ...watchList(nodes, edges, repo, allRules),
    ],
    rules: allRules,
    walks: allWalks,
  };
}
