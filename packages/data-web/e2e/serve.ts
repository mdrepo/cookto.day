import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Serves the IndexedDB test page (e2e/page.ts, bundled) on localhost: the
// browser's storage needs a real origin, not a file or about:blank.

const port = Number(process.env.PORT ?? 3399);
const out = mkdtempSync(join(tmpdir(), "data-web-e2e-"));
process.on("exit", () => {
  rmSync(out, { recursive: true, force: true });
});

const built = await Bun.build({
  entrypoints: [join(import.meta.dir, "page.ts")],
  outdir: out,
  target: "browser",
});
if (!built.success)
  throw new AggregateError(built.logs, "Building the page failed");
const script = built.outputs[0]?.path;
if (!script) throw new Error("The page build made no script.");

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>IndexedDB</title></head><body><script type="module" src="/page.js"></script></body></html>`;

const server = Bun.serve({
  hostname: "localhost",
  port,
  fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname === "/page.js")
      return new Response(Bun.file(script), {
        headers: { "content-type": "text/javascript" },
      });
    return new Response(PAGE, { headers: { "content-type": "text/html" } });
  },
});
console.info(`IndexedDB test page on ${server.url.href}`);
