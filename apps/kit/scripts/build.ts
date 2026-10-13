import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { Glob } from "bun";

// Builds the kit page (ADR 0019): every part in packages/ui, from its
// *.kit.tsx, in light and dark, English and Arabic. One static page with its
// stylesheet and no script: it's for looking at, and needs nothing to run.
// The deploy puts it at cookto.day/kit/.
//
// The page is rendered here, from a bundle, so CSS Modules get the same class
// names in the markup as in the stylesheet.

/** The app's folder: apps/kit. */
export const APP_DIR = join(import.meta.dir, "..");
const UI = join(APP_DIR, "../../packages/ui/src");
const ROOT = '<div id="kit"></div>';

/** Every component's kit file, then every layout's, each in name order. */
function kitFiles(): string[] {
  return [
    ...new Glob("{components,layouts}/*/*.kit.tsx").scanSync({
      cwd: UI,
      absolute: true,
    }),
  ].sort();
}

/** An entry that imports the page and every kit, and renders them. */
function entrySource(dir: string, kits: string[]): string {
  const from = (f: string) => JSON.stringify(relative(dir, f));
  return [
    'import { renderToStaticMarkup } from "react-dom/server";',
    `import { KitPage } from ${from(join(APP_DIR, "src/page.tsx"))};`,
    ...kits.map((f, i) => `import { kit as k${i} } from ${from(f)};`),
    `export const html = () => renderToStaticMarkup(<KitPage kits={[${kits.map((_, i) => `k${i}`).join(", ")}]} />);`,
  ].join("\n");
}

/** Builds the kit page into `outdir` and returns the files written. */
export async function buildKit(
  outdir = join(APP_DIR, "dist"),
): Promise<string[]> {
  rmSync(outdir, { recursive: true, force: true });
  // Inside the app, so the entry finds React and the workspace packages.
  const work = join(APP_DIR, ".build");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  try {
    const entry = join(work, "entry.tsx");
    writeFileSync(entry, entrySource(work, kitFiles()));
    const result = await Bun.build({
      entrypoints: [entry],
      outdir: join(work, "out"),
      target: "bun",
      naming: { asset: "[name]-[hash].[ext]" },
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      minify: true,
    });
    if (!result.success)
      throw new AggregateError(result.logs, "Kit build failed");
    const js = result.outputs.find((o) => o.path.endsWith(".js"));
    const css = result.outputs.find((o) => o.path.endsWith(".css"));
    if (!js || !css) throw new Error("The kit build made no script or styles.");
    const { html } = (await import(js.path)) as { html: () => string };

    mkdirSync(outdir, { recursive: true });
    const styles = `kit-${Bun.hash(await css.text()).toString(36)}.css`;
    writeFileSync(join(outdir, styles), await css.text());
    const page = readFileSync(join(APP_DIR, "src/index.html"), "utf8")
      .replace(
        "</head>",
        `  <link rel="stylesheet" href="./${styles}" />\n  </head>`,
      )
      .replace(ROOT, `<div id="kit">${html()}</div>`);
    writeFileSync(join(outdir, "index.html"), page);
    // Images the parts import, like the logo, beside the page.
    const assets = result.outputs.filter((o) => o.kind === "asset");
    for (const a of assets)
      writeFileSync(
        join(outdir, basename(a.path)),
        new Uint8Array(await a.arrayBuffer()),
      );
    return [
      join(outdir, "index.html"),
      join(outdir, styles),
      ...assets.map((a) => join(outdir, basename(a.path))),
    ];
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const files = await buildKit();
  console.info(
    `Built the kit (${files.map((f) => basename(f)).join(", ")}) into apps/kit/dist/.`,
  );
}
