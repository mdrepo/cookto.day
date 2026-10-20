import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { buildSite } from "../../scripts/build.js";

// What the build ships, besides size (see ../budget): the page people can
// read before any script runs, and how long browsers may keep each file.

let outdir = "";
let files: string[] = [];
beforeAll(async () => {
  outdir = mkdtempSync(join(tmpdir(), "cookto-build-"));
  files = await buildSite(outdir);
});
afterAll(() => {
  rmSync(outdir, { recursive: true, force: true });
});

const page = () => {
  const html = files.find((f) => f.endsWith("index.html"));
  if (!html) throw new Error("The build produced no index page.");
  return readFileSync(html, "utf8");
};

describe("the built site", () => {
  test("the page is readable before its script runs, rendered from the app itself", () => {
    const html = page();
    expect(html).toContain("Your kitchen is empty");
    // The tab bar too, as the app draws it: More, where Settings and the
    // packs are (specs/175).
    expect(html).toContain(">More<");
  });

  test("browsers keep every hashed file for a year, and never the page, within Cloudflare's 100 rules", () => {
    const headers = readFileSync(join(outdir, "_headers"), "utf8");
    const hashed = files.filter((f) => !f.endsWith(".html"));
    expect(hashed.length).toBeGreaterThan(0);
    // One rule per kind of file, not per file: Cloudflare refuses a
    // _headers file with more than 100 rules, and the dish photos alone
    // are more than that (the deploy of #214 failed on it).
    const rules = headers.split("\n").filter((line) => line.startsWith("/"));
    expect(rules.length).toBeLessThanOrEqual(100);
    for (const f of hashed) {
      expect(headers).toContain(
        `/*${extname(f)}\n  Cache-Control: public, max-age=31536000, immutable\n`,
      );
    }
    expect(headers).not.toContain(".html");
    expect(basename(hashed[0] ?? "")).toMatch(/[a-z0-9]{8}\./);
  });
});
