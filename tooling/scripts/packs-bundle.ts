import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { bundlePack } from "./packs-bundle-lib.js";
import { readPacks } from "./packs-files.js";

// packs:bundle: writes each pack as the app loads it, and how many dishes
// each has, into packages/data/src/packs/. A pack is one JSON string in a .ts
// file, so it stays one line (and under the file size limit) after Prettier.
// `--check` only says whether they're current: packs:check runs it.

const OUT = "packages/data/src/packs";
const HEADER =
  "// Written by `bun run packs:bundle` from packs/. Don't edit: change the pack.\n";

function wanted(): Map<string, unknown> {
  const packs = readPacks();
  const files = new Map<string, unknown>(
    packs.map((pack) => [`${pack.id}.ts`, bundlePack(pack)]),
  );
  files.set(
    "catalog.ts",
    Object.fromEntries(packs.map((p) => [p.id, Object.keys(p.dishes).length])),
  );
  return files;
}

async function current(path: string): Promise<unknown> {
  if (!existsSync(path)) return undefined;
  const module = (await import(resolve(path))) as { default: string };
  return JSON.parse(module.default);
}

const check = process.argv.includes("--check");
const stale: string[] = [];
for (const [name, value] of wanted()) {
  const path = join(OUT, name);
  if (isDeepStrictEqual(await current(path), value)) continue;
  if (check) stale.push(path);
  else
    writeFileSync(
      path,
      `${HEADER}export default ${JSON.stringify(JSON.stringify(value))};\n`,
    );
}
if (stale.length > 0) {
  console.error(
    `Pack bundles are out of date: ${stale.join(", ")}. Run \`bun run packs:bundle\`.`,
  );
  process.exit(1);
}
if (!check)
  execFileSync("bunx", ["prettier", "--write", OUT], { stdio: "ignore" });
