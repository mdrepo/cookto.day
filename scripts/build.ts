import { rmSync } from "node:fs";
import { Glob } from "bun";

// Builds the static site (ADR 0013): every page in src/*.html, with the
// scripts and stylesheets it links bundled, minified and hashed into dist/.
// No server code: dist/ is all there is to host.

/** Builds every page into `outdir` and returns the files written. */
export async function buildSite(outdir = "dist"): Promise<string[]> {
  rmSync(outdir, { recursive: true, force: true });
  const pages = [...new Glob("src/*.html").scanSync()];
  if (pages.length === 0) return [];
  const result = await Bun.build({
    entrypoints: pages,
    outdir,
    target: "browser",
    minify: true,
  });
  if (!result.success) {
    throw new AggregateError(result.logs, "Build failed");
  }
  return result.outputs.map((o) => o.path);
}

if (import.meta.main) {
  const files = await buildSite();
  console.info(`Built ${files.length} file(s) into dist/.`);
}
