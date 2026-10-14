import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { Glob } from "bun";

// Builds the static site (ADR 0013): every page in src/*.html, with the
// scripts and stylesheets it links bundled, minified and hashed into dist/.
// No server code: dist/ is all there is to host. Paths are relative to this
// app (apps/web), wherever the command runs from.
//
// React goes into a file of its own, whose name changes only with React's
// version, and every hashed file is cached for a year (ADR 0018). So a repeat
// visit, or a deploy that only changed our code, doesn't download React again.
// Each page's empty <div id="app"></div> is filled with the app's English
// markup, so the page reads before the script runs; React then takes it over.

/** The app's folder: apps/web. */
export const APP_DIR = join(import.meta.dir, "..");

/** The entry that splits React out (src/react.ts). Its own output is dropped. */
const REACT_ENTRY = join(APP_DIR, "src/react.ts");

export interface BuildOptions {
  /**
   * Split React into its own file. On for the site; the DOM tests turn it
   * off, because they run the page's script as one inline file.
   */
  split?: boolean;
}

/**
 * A script loaded later (like a dish's page, #95) gets a stylesheet of its
 * own from Bun, a copy of styles the page's own stylesheet already has, and
 * nothing loads it. Ship only the stylesheets a page links.
 */
function dropUnlinkedStyles(files: string[]): void {
  const pages = files
    .filter((f) => f.endsWith(".html"))
    .map((f) => readFileSync(f, "utf8"));
  for (const css of files.filter((f) => f.endsWith(".css"))) {
    if (pages.some((html) => html.includes(`./${basename(css)}`))) continue;
    rmSync(css);
    files.splice(files.indexOf(css), 1);
  }
}

/** Builds every page into `outdir` and returns the files written. */
export async function buildSite(
  outdir = join(APP_DIR, "dist"),
  { split = true }: BuildOptions = {},
): Promise<string[]> {
  rmSync(outdir, { recursive: true, force: true });
  const pages = [
    ...new Glob("src/*.html").scanSync({ cwd: APP_DIR, absolute: true }),
  ];
  if (pages.length === 0) return [];
  const result = await Bun.build({
    entrypoints: split ? [...pages, REACT_ENTRY] : pages,
    outdir,
    target: "browser",
    minify: true,
    splitting: split,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    // React Compiler memoises the app, so nobody writes useMemo (ADR 0023).
    reactCompiler: true,
  });
  if (!result.success) {
    throw new AggregateError(result.logs, "Build failed");
  }
  const files: string[] = [];
  for (const o of result.outputs) {
    if (o.kind === "entry-point" && basename(o.path) === "react.js")
      rmSync(o.path);
    else files.push(o.path);
  }
  const app = await renderApp();
  for (const page of files.filter((f) => f.endsWith(".html")))
    prerender(page, app);
  dropUnlinkedStyles(files);
  writeHeaders(outdir, files);
  return files;
}

const APP_ROOT = '<div id="app"></div>';

/**
 * The app as it first renders, in English. Rendered from a bundle of it, so
 * the components' CSS Modules have the same class names in this markup as in
 * the page's stylesheet.
 */
async function renderApp(): Promise<string> {
  // Inside the app, so the entry finds React; a new folder each time, so
  // builds running side by side don't meet.
  mkdirSync(join(APP_DIR, ".build"), { recursive: true });
  const dir = mkdtempSync(join(APP_DIR, ".build", "render-"));
  try {
    const entry = join(dir, "entry.tsx");
    writeFileSync(
      entry,
      [
        'import { renderToStaticMarkup } from "react-dom/server";',
        `import { App } from ${JSON.stringify(join(APP_DIR, "src/app.tsx"))};`,
        "export const html = () => renderToStaticMarkup(<App />);",
      ].join("\n"),
    );
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: join(dir, "out"),
      target: "bun",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      // The same compiler as the browser's, without memoising: this renders
      // once, on the server (ADR 0023).
      reactCompiler: true,
      reactCompilerOutputMode: "ssr",
    });
    const js = result.outputs.find((o) => o.kind === "entry-point");
    if (!result.success || !js)
      throw new AggregateError(result.logs, "Rendering the app failed");
    const { html } = (await import(js.path)) as { html: () => string };
    return html();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Fills the page's app root with the app's first render. */
function prerender(page: string, app: string): void {
  const html = readFileSync(page, "utf8");
  if (!html.includes(APP_ROOT)) return;
  writeFileSync(page, html.replace(APP_ROOT, `<div id="app">${app}</div>`));
}

/**
 * Cloudflare's `_headers` file: every file but the pages has a content hash
 * in its name, so browsers may keep it for a year without asking. Pages keep
 * Cloudflare's default (always revalidate), so a deploy shows at once.
 */
function writeHeaders(outdir: string, files: string[]): void {
  const rules = files
    .filter((f) => !f.endsWith(".html"))
    .map(
      (f) =>
        `/${basename(f)}\n  Cache-Control: public, max-age=31536000, immutable\n`,
    );
  writeFileSync(join(outdir, "_headers"), rules.join(""));
}

if (import.meta.main) {
  const files = await buildSite();
  console.info(`Built ${files.length} file(s) into apps/web/dist/.`);
}
