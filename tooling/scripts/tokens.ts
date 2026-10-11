import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import {
  renderCss,
  renderTables,
  renderTs,
  replaceTables,
  tokenProblems,
  type TokenSources,
} from "./tokens-lib.js";

// `bun run tokens` (ADR 0019): reads packages/ui/tokens/*.tokens.json and
// writes the CSS variables, the spacing steps for TypeScript and DESIGN.md's
// token tables. design:check runs
// the same and fails when the committed files differ, so they can't drift.

const ROOT = join(import.meta.dir, "../..");
const TOKENS = join(ROOT, "packages/ui/tokens");

export function readSources(): TokenSources {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(join(TOKENS, `${name}.tokens.json`), "utf8"),
    ) as Record<string, unknown>;
  return {
    palette: read("palette"),
    base: read("base"),
    light: read("light"),
    dark: read("dark"),
  };
}

/** Each generated file and what it should hold, formatted as Prettier would. */
export async function generated(
  s: TokenSources,
): Promise<{ path: string; content: string }[]> {
  const css = join(ROOT, "packages/ui/src/tokens.css");
  const ts = join(ROOT, "packages/ui/src/tokens.ts");
  const design = join(ROOT, "DESIGN.md");
  const md = replaceTables(readFileSync(design, "utf8"), renderTables(s));
  return [
    { path: css, content: await format(renderCss(s), { filepath: css }) },
    { path: ts, content: await format(renderTs(s), { filepath: ts }) },
    { path: design, content: await format(md, { filepath: design }) },
  ];
}

if (import.meta.main) {
  const sources = readSources();
  const problems = tokenProblems(sources);
  if (problems.length > 0) {
    console.error(
      `The tokens have ${String(problems.length)} problem(s):\n${problems.map((p) => `  ${p}`).join("\n")}`,
    );
    process.exit(1);
  }
  for (const { path, content } of await generated(sources))
    writeFileSync(path, content);
  console.info(
    "Wrote packages/ui/src/tokens.css, tokens.ts and DESIGN.md's token tables.",
  );
}
