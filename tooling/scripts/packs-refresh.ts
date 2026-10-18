import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { readPacks, SOURCES } from "./packs-files.js";
import type { FoodKeeperEntry } from "./packs-lib.js";

// packs:refresh (ADR 0027): stores Wikidata's English label for every id
// the packs use, and the USDA FoodKeeper entries they cite, in packs/sources/,
// so packs:check runs offline. FoodKeeper is public domain (CC0). Its site
// refuses scripts, so the Internet Archive's copy (2 July 2025) is the fallback.

const AGENT = "cookto.day packs:refresh (https://github.com/mdrepo/cookto.day)";
const FOODKEEPER = [
  "https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json",
  "https://web.archive.org/web/20250702182320id_/https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json",
];

const packs = readPacks();
const ids = new Set(
  packs.flatMap((p) => Object.values(p.ingredients).map((i) => i.wikidata)),
);
const cited = new Set(
  packs.flatMap((p) =>
    Object.values(p.ingredients).flatMap((i) => [
      ...(i.keeps ? [String(i.keeps.foodkeeper)] : []),
      ...(i.freezes ? [String(i.freezes.foodkeeper)] : []),
    ]),
  ),
);

async function labels(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const all = [...ids].sort();
  for (let i = 0; i < all.length; i += 50) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&languages=en&format=json&ids=${all.slice(i, i + 50).join("|")}`;
    const res = await fetch(url, { headers: { "User-Agent": AGENT } });
    const body = (await res.json()) as {
      entities: Record<string, { labels?: { en?: { value: string } } }>;
    };
    for (const [id, e] of Object.entries(body.entities))
      if (e.labels?.en) out[id] = e.labels.en.value;
  }
  return out;
}

type Cell = Record<string, string | number | null>;
const DAYS: Record<string, number> = {
  Days: 1,
  Weeks: 7,
  Months: 30,
  Years: 365,
};

async function foodkeeperRows(): Promise<Cell[]> {
  for (const url of FOODKEEPER) {
    const res = await fetch(url, { headers: { "User-Agent": AGENT } });
    if (!res.ok) continue;
    let bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
    const data = JSON.parse(new TextDecoder().decode(bytes)) as {
      sheets: { name: string; data: Cell[][] }[];
    };
    const sheet = data.sheets.find((s) => s.name === "Product");
    if (sheet)
      return sheet.data.map((row) => Object.assign({}, ...row) as Cell);
  }
  throw new Error(
    "Couldn't fetch FoodKeeper from any of: " + FOODKEEPER.join(", "),
  );
}

function range(row: Cell, where: string): [number, number] | null {
  for (const prefix of [where, `DOP_${where}`]) {
    const min = row[`${prefix}_Min`];
    const max = row[`${prefix}_Max`];
    const unit = DAYS[String(row[`${prefix}_Metric`])];
    if (typeof min === "number" && typeof max === "number" && unit)
      return [min * unit, max * unit];
  }
  return null;
}

async function entries(): Promise<Record<string, FoodKeeperEntry>> {
  if (cited.size === 0) return {};
  const out: Record<string, FoodKeeperEntry> = {};
  for (const row of await foodkeeperRows()) {
    const id = String(row["ID"]);
    if (!cited.has(id)) continue;
    const name = [row["Name"], row["Name_subtitle"]].filter(Boolean).join(", ");
    out[id] = {
      name: name.trim(),
      fridge: range(row, "Refrigerate"),
      pantry: range(row, "Pantry"),
      freezer: range(row, "Freeze"),
    };
  }
  return out;
}

mkdirSync(SOURCES, { recursive: true });
const write = (name: string, value: object) => {
  writeFileSync(join(SOURCES, name), JSON.stringify(value, null, 2) + "\n");
};
write("wikidata.json", await labels());
write("foodkeeper.json", await entries());
execFileSync("bunx", ["prettier", "--write", SOURCES], { stdio: "ignore" });
console.log(
  `packs:refresh: ${ids.size} Wikidata labels and ${cited.size} FoodKeeper entries stored in ${SOURCES}/.`,
);
