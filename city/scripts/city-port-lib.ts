import {
  BROWSER,
  PORT,
  inland,
  plural,
  road,
  type Gate,
  type Roads,
  type Scan,
} from "./city-borders-lib.js";
import type { CityNode } from "./city-graph-lib.js";

// The gates at the port and the city's edge (bun run city): customs, the
// messenger, the way out, the AI limits, the migrations and the vault. Pure;
// unit tests in test/city-borders.test.ts.

/**
 * Calls fetch( itself: not obj.fetch( or prefetch(, and not a Worker's own
 * fetch(request, env) handler, which starts its line, maybe after async.
 */
const FETCH = /^.*[^\s\w.$][ \t]*fetch\(|^.*\b(?!async\b)\w+[ \t]+fetch\(/m;
/** The two files that may call out: the app's network adapter and the API's. */
const WAYS = ["packages/data/src/network.ts", "apps/api/src/network.ts"];
const abroad = (n: CityNode) => (n.info.abroad as string[] | undefined) ?? [];
const port = (n: CityNode) => PORT.has(n.layer);

function customs(scan: Scan): Gate {
  const phone = scan.nodes.filter(
    (n) =>
      BROWSER.has(n.layer) || (n.layer === "engine" && n.group !== "testing"),
  );
  const shipped = [...new Set(phone.flatMap(abroad))].sort();
  return {
    id: "customs",
    adr: "0018",
    title: "Customs: only the guest list ships",
    at: "city",
    side: "west",
    lets: `The packages on the guest list that ship to phones: ${scan.shipping.join(", ")}.`,
    stops: "Any other package in what runs on people's phones.",
    guard: "deps:check, deps:health and knip (with ADR 0005)",
    through: [],
    today: `${plural(shipped.length, "package")} cross today: ${shipped.join(", ")}.`,
    over: phone.flatMap((n) => {
      const out = abroad(n).filter((p) => !scan.shipping.includes(p));
      return out.length
        ? [{ text: `${n.label} brings in ${out.join(", ")}`, ids: [n.id] }]
        : [];
    }),
  };
}

function send(_: Scan, r: Roads): Gate {
  const messenger = (n: CityNode) => n.layer === "messenger";
  return {
    id: "send",
    adr: "0031",
    title: "Only the port sends messages",
    at: "messenger",
    side: "front",
    lets: "The API, alone, handing messages to the messenger.",
    stops: "The app talking to Telegram or any messaging service itself.",
    guard: "The layer lint rules (ESLint)",
    through: r.where((a, b) => port(a) && !messenger(a) && messenger(b)),
    today: "",
    over: r
      .pairs((n) => !port(n), messenger)
      .map((p) => r.item(p, "sends without the port")),
  };
}

function leave(scan: Scan): Gate {
  const callers = scan.nodes.filter(
    (n) => n.info.path && FETCH.test(scan.repo.read(n.id)),
  );
  const ways = callers.filter((n) => WAYS.includes(n.id));
  return {
    id: "leave",
    adr: "0025",
    title: "Nothing leaves except through our API",
    at: "api",
    side: "east",
    lets: "Sign-in, sync between a household's phones, and the bot: one network file on each side.",
    stops:
      "Bills, names, addresses or phone numbers kept on the server. Analytics. Fonts or scripts from other sites.",
    guard:
      "ESLint's fetch rule, the page's Content-Security-Policy, the size budget, e2e with no internet",
    through: [],
    today: `Calls go out from ${plural(ways.length, "building")}: ${ways.map((n) => n.info.path).join(" and ") || "none"}.`,
    over: callers
      .filter((n) => !WAYS.includes(n.id))
      .map((n) => ({ text: `${n.label} calls fetch itself`, ids: [n.id] })),
  };
}

function ai(_: Scan, r: Roads): Gate {
  const usage = (n: CityNode) => n.layer === "api" && n.group === "usage";
  return {
    id: "ai",
    adr: "0028",
    title: "Every AI call passes its limits first",
    at: "api",
    side: "east",
    lets: "A receipt photo read by AI, once the day's limits allow it.",
    stops:
      "An AI call that skips the limits, or a log line with a receipt's words.",
    guard: "The API's tests for usage and the ledger",
    through: r.where((a, b) => a.layer === "api" && !usage(a) && usage(b)),
    today: "",
    over: [],
  };
}

function db(scan: Scan): Gate {
  const files = scan.repo.files.filter((f) =>
    /^db\/migrations\/\d{4}_.*\.(up|down)\.sql$/.test(f),
  );
  const pair = (f: string) =>
    f.endsWith(".up.sql")
      ? f.replace(/\.up\.sql$/, ".down.sql")
      : f.replace(/\.down\.sql$/, ".up.sql");
  const ups = files.filter((f) => f.endsWith(".up.sql"));
  const count = (sql: string, re: RegExp) => (sql.match(re) ?? []).length;
  const open = ups.filter((f) => {
    const sql = scan.repo.read(f).toLowerCase();
    return (
      count(sql, /create table/g) > count(sql, /enable row level security/g)
    );
  });
  return {
    id: "db",
    adr: "0032",
    title: "The database changes only by migrations",
    at: "api",
    side: "east",
    lets: `Numbered up and down pairs that you run: ${plural(ups.length, "migration")} today.`,
    stops:
      "A change made in the Supabase dashboard. A table without row-level security.",
    guard: "CI applies every migration up and down on a throwaway Postgres",
    through: [],
    today: "",
    over: [
      ...files
        .filter((f) => !files.includes(pair(f)))
        .map((f) => ({ text: `${f} has no pair`, file: f })),
      ...open.map((f) => ({
        text: `${f} makes a table without row-level security`,
        file: f,
      })),
    ],
  };
}

function vault(scan: Scan): Gate {
  const keyed = scan.nodes.filter(
    (n) => n.layer === "api" && /\benv\.[A-Z_]+/.test(scan.repo.read(n.id)),
  );
  return {
    id: "vault",
    adr: "0030",
    title: "The vault: secrets only in Cloudflare",
    at: "api",
    side: "front",
    lets: "Keys you save from your laptop, read from env in one place.",
    stops: "A key in the repo, a log, an issue or a chat.",
    guard: "gitleaks in CI, and GET /api/health/keys",
    through: [],
    today: `Keys are read in ${plural(keyed.length, "building")}: ${keyed.map((n) => n.label).join(", ") || "none"}.`,
    over: [],
  };
}

/** Every gate, customs first, with today's count in words. */
export function gates(scan: Scan): Gate[] {
  const r = road(scan);
  const n = (g: Gate) => g.through.length;
  return [
    customs(scan),
    ...inland(scan),
    ...[send, leave, ai, db, vault].map((g) => g(scan, r)),
  ].map((g) => ({
    ...g,
    today:
      g.today ||
      (n(g) === 1
        ? "1 road goes through today."
        : n(g)
          ? `${n(g)} roads go through today.`
          : "No road needs to cross."),
  }));
}
