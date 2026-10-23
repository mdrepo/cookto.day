import type { NoticeItem } from "./city-gaps-lib.js";
import type { CityEdge, CityNode, Repo } from "./city-graph-lib.js";

// The city's walls and gates (bun run city): each ADR that governs a place
// stands where it acts, as a wall with a gate. A gate says what it lets
// through, what it stops and what guards it; the scan counts the roads
// through it today and finds any that go over the wall instead. The gates
// inside the city are here; the port's and the edge's in city-port-lib.ts.
// Pure; unit tests in test/city-borders.test.ts.

export interface Gate {
  id: string;
  adr: string;
  title: string;
  /** Where it stands on the page: a block id, "downtown" or "city", and which side. */
  at: string;
  side: "front" | "back" | "west" | "east";
  lets: string;
  stops: string;
  guard: string;
  /** Roads through the gate today, as [from, to] building ids. */
  through: [string, string][];
  /** Today's count, in words; empty for "n roads go through today". */
  today: string;
  /** Roads or files over the wall: each one breaks the ADR. */
  over: NoticeItem[];
}

export interface Scan {
  nodes: CityNode[];
  edges: CityEdge[];
  repo: Repo;
  /** "@cookto/x" names to the files they open onto (packageExports). */
  doors: Record<string, string>;
  /** The packages that may ship to people's phones (the allowlist's dependencies). */
  shipping: string[];
  /** Roads from outside a package that skip its doors (trespasses). */
  trespasses: NoticeItem[];
}

/** Which way roads run (ADR 0022): from the street down towards the engine. */
export const RANK: Record<string, number> = {
  app: 9,
  screens: 8,
  ui: 7,
  hooks: 6,
  usecases: 5,
  data: 4,
  engine: 3,
  packs: 2,
  dishes: 1,
  ingredients: 0,
};
export const BROWSER = new Set([
  "app",
  "screens",
  "hooks",
  "ui",
  "usecases",
  "data",
]);
export const PORT = new Set(["api", "messenger", "workflows"]);
const isFeature = (n: CityNode) =>
  (n.layer === "screens" || n.layer === "hooks") && n.group !== "app shell";
const layer =
  (...ls: string[]) =>
  (n: CityNode) =>
    ls.includes(n.layer);
export const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;

/** The import roads, to pick from by what is at either end. */
export function road(scan: Scan) {
  const by = new Map(scan.nodes.map((n) => [n.id, n]));
  const ends = scan.edges
    .filter((e) => e.k === "import")
    .flatMap((e) => {
      const a = by.get(e.s),
        b = by.get(e.t);
      return a && b ? [{ a, b }] : [];
    });
  const where = (keep: (a: CityNode, b: CityNode) => boolean) =>
    ends
      .filter(({ a, b }) => keep(a, b))
      .map(({ a, b }): [string, string] => [a.id, b.id]);
  return {
    where,
    pairs: (from: (n: CityNode) => boolean, to: (n: CityNode) => boolean) =>
      where((a, b) => from(a) && to(b)),
    item: ([s, t]: [string, string], why: string): NoticeItem => ({
      text: `${by.get(s)?.label ?? s} → ${by.get(t)?.label ?? t}: ${why}`,
      ids: [s, t],
    }),
  };
}
export type Roads = ReturnType<typeof road>;

function write(scan: Scan, r: Roads): Gate {
  const door = scan.doors["@cookto/data/write"];
  return {
    id: "write",
    adr: "0022",
    title: "Writes go through a use case",
    at: "usecases",
    side: "front",
    lets: "Screens and their hooks asking a use case to save something.",
    stops: "A screen or anything else writing to the phone's data itself.",
    guard: "The layer lint rules (ESLint)",
    through: r.pairs(isFeature, layer("usecases")),
    today: "",
    over: r
      .pairs(
        (n) => n.layer !== "usecases",
        (n) => n.id === door,
      )
      .map((p) => r.item(p, "writes without a use case")),
  };
}

function trade(_: Scan, r: Roads): Gate {
  return {
    id: "trade",
    adr: "0022",
    title: "Features don't trade directly",
    at: "downtown",
    side: "back",
    lets: "Nothing between two features. What two share moves down a layer.",
    stops: "One feature reaching into another, like Today into the fridge.",
    guard: "The layer lint rules (ESLint)",
    through: [],
    today: "",
    over: r
      .where((a, b) => isFeature(a) && isFeature(b) && a.group !== b.group)
      .map((p) => r.item(p, "one feature reaches into another")),
  };
}

function oneway(_: Scan, r: Roads): Gate {
  const rank = (n: CityNode) => RANK[n.layer];
  return {
    id: "oneway",
    adr: "0022",
    title: "Roads run one way",
    at: "usecases",
    side: "east",
    lets: "Use cases calling data and the engine; data calling the engine.",
    stops: "A road back up: the engine using data, data using a use case.",
    guard: "The layer lint rules for features; you read the rest",
    through: r.pairs(layer("usecases"), layer("data", "engine")),
    today: "",
    over: r
      .where((a, b) => (rank(b) ?? -1) > (rank(a) ?? 99))
      .map((p) => r.item(p, "runs back up the layers")),
  };
}

function kit(scan: Scan, r: Roads): Gate {
  const css = scan.repo.files.filter((f) =>
    /^apps\/web\/src\/.*\.css$/.test(f),
  );
  return {
    id: "kit",
    adr: "0019",
    title: "The look comes from the kit",
    at: "ui",
    side: "front",
    lets: "Screens built from the kit's parts and layouts.",
    stops: "Styles of an app's own: the app has no CSS outside the kit.",
    guard: "design:check, and the CSS Modules rule",
    through: r.pairs(layer("screens", "hooks", "app"), layer("ui")),
    today: "",
    over: css.map((f) => ({ text: `${f}: CSS outside the kit`, file: f })),
  };
}

function door(scan: Scan, r: Roads): Gate {
  const doors = Object.values(scan.doors);
  return {
    id: "door",
    adr: "0016",
    title: "Through the front door",
    at: "data",
    side: "front",
    lets: "Roads from another package that enter by a name its package.json exports.",
    stops: "A road into a package's inner rooms, past its exports.",
    guard: "The package exports (TypeScript and knip)",
    through: r.where(
      (a, b) =>
        doors.includes(b.id) && a.id.split("/")[1] !== b.id.split("/")[1],
    ),
    today: "",
    over: scan.trespasses,
  };
}

function phone(scan: Scan): Gate {
  const adapter = (n: CityNode) => n.id.startsWith("packages/data-web/");
  const opens = scan.nodes.filter(
    (n) =>
      n.info.path && !adapter(n) && /\bindexedDB\./.test(scan.repo.read(n.id)),
  );
  return {
    id: "phone",
    adr: "0024",
    title: "The phone's own copy",
    at: "data",
    side: "back",
    lets: `The IndexedDB adapter, in ${plural(scan.nodes.filter(adapter).length, "building")}.`,
    stops: "Any other building reaching into the phone's storage.",
    guard: "The data layer's tests; you read the rest",
    through: [],
    today: "",
    over: opens.map((n) => ({
      text: `${n.label} opens IndexedDB itself`,
      ids: [n.id],
    })),
  };
}

/** The gates inside the city: the layers, the kit, the doors, the phone's data. */
export function inland(scan: Scan): Gate[] {
  const r = road(scan);
  return [write, trade, oneway, kit, door, phone].map((g) => g(scan, r));
}

/** The roads and files over a wall, as one notice's items, each saying which wall. */
export function overTheWall(all: Gate[]): NoticeItem[] {
  return all.flatMap((g) =>
    g.over.map((it) => ({
      ...it,
      text: `ADR ${g.adr}, ${g.title}: ${it.text}`,
    })),
  );
}
