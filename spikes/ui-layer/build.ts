import { readFileSync, rmSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

// Builds both versions the way scripts/build.ts builds the app, prints the
// gzipped JS size of each, and with --serve serves them on port 3399.

const OUT = join(import.meta.dir, "dist");
rmSync(OUT, { recursive: true, force: true });

for (const version of ["vanilla", "preact"]) {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, version, "index.html")],
    outdir: join(OUT, version),
    target: "browser",
    minify: true,
  });
  if (!result.success)
    throw new AggregateError(result.logs, `${version} failed`);
  const js = result.outputs.filter((o) => o.path.endsWith(".js"));
  const raw = js.reduce((n, o) => n + readFileSync(o.path).length, 0);
  const gz = js.reduce((n, o) => n + gzipSync(readFileSync(o.path)).length, 0);
  console.info(`${version}: ${String(raw)} bytes of JS, ${String(gz)} gzipped`);
}

if (process.argv.includes("--serve")) {
  Bun.serve({
    hostname: "localhost",
    port: 3399,
    fetch(req) {
      let path = new URL(req.url).pathname;
      if (path.endsWith("/")) path += "index.html";
      const file = Bun.file(join(OUT, path));
      return file.size
        ? new Response(file)
        : new Response("Not found", { status: 404 });
    },
  });
  console.info("Serving the spike on http://localhost:3399/");
}
