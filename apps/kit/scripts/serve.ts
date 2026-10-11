import { existsSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { APP_DIR, buildKit } from "./build.js";

// `bun run --cwd apps/kit dev`: builds the kit, then serves it at /kit/, as
// cookto.day does. The e2e tests run against this too (ADR 0004).

const ROOT = join(APP_DIR, "dist");
const BASE = "/kit/";
const port = Number(process.env.PORT ?? 3001);

await buildKit(ROOT);

function fileFor(pathname: string): string | null {
  if (!pathname.startsWith(BASE)) return null;
  const rel = normalize(
    decodeURIComponent(pathname.slice(BASE.length)),
  ).replace(/^(\.\.(\/|$))+/, "");
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
console.info(`The kit on ${server.url.href}kit/`);
