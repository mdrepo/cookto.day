import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { bundlePack } from "./packs-bundle-lib.js";
import { format } from "prettier";
import type { Pack } from "./packs-lib.js";
import { PACKS, readPacks } from "./packs-files.js";

// packs:bundle: writes each pack as the app loads it, and how many dishes
// each has, into packages/data/src/packs/. A pack is one JSON string in a .ts
// file, so it stays one line (and under the file size limit) after Prettier.
// A pack with photos also gets <id>.photos.ts, which imports each photo so
// Bun copies it into the site and gives its address (specs/118).
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

/** A pack's photos, as the app imports them: each dish's photo and its small one. */
async function photosModule(pack: Pack): Promise<string | null> {
  const slugs = Object.keys(pack.photos ?? {}).filter(
    (s) => pack.dishes[s]?.photo,
  );
  if (slugs.length === 0) return null;
  const at = (file: string) =>
    JSON.stringify(`../../../../${PACKS}/${pack.id}/photos/${file}`);
  const code = [
    "// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- every package that compiles this file needs the photos' type",
    '/// <reference path="../images.d.ts" />',
    HEADER,
    ...slugs.flatMap((s, i) => [
      `import p${String(i)} from ${at(`${s}.webp`)};`,
      `import p${String(i)}s from ${at(`${s}.small.webp`)};`,
    ]),
    "",
    `const photos: Record<string, readonly [string, string]> = {${slugs
      .map((s, i) => `${JSON.stringify(s)}: [p${String(i)}, p${String(i)}s]`)
      .join(", ")}};`,
    "export default photos;",
  ].join("\n");
  return format(code, { parser: "typescript" });
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
for (const pack of readPacks()) {
  const code = await photosModule(pack);
  if (code === null) continue;
  const path = join(OUT, `${pack.id}.photos.ts`);
  if (existsSync(path) && readFileSync(path, "utf8") === code) continue;
  if (check) stale.push(path);
  else writeFileSync(path, code);
}
if (stale.length > 0) {
  console.error(
    `Pack bundles are out of date: ${stale.join(", ")}. Run \`bun run packs:bundle\`.`,
  );
  process.exit(1);
}
if (!check)
  execFileSync("bunx", ["prettier", "--write", OUT], { stdio: "ignore" });
