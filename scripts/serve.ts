import { existsSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { buildSite } from "./build.js";

// `bun run dev`: builds the site, then serves dist/ on localhost, the way a
// static host would. The e2e tests run against this too (ADR 0004).
// Rerun it after a change.

const ROOT = "dist";
const port = Number(process.env.PORT ?? 3000);

await buildSite(ROOT);

function fileFor(pathname: string): string | null {
  const rel = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.(\/|$))+/,
    "",
  );
  let file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) return null;
  if (existsSync(file) && statSync(file).isDirectory())
    file = join(file, "index.html");
  return existsSync(file) ? file : null;
}

const server = Bun.serve({
  hostname: "localhost",
  port,
  fetch(req) {
    const file = fileFor(new URL(req.url).pathname);
    return file
      ? new Response(Bun.file(file))
      : new Response("Not found", { status: 404 });
  },
});
console.info(`cookto.day on ${server.url.href}`);
