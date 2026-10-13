import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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
    // The header too, as the app draws it: the gear to Settings, where the
    // language list moved in #84.
    expect(html).toContain('aria-label="Settings"');
  });

  test("browsers keep every hashed file for a year, and never the page", () => {
    const headers = readFileSync(join(outdir, "_headers"), "utf8");
    const hashed = files.filter((f) => !f.endsWith(".html"));
    expect(hashed.length).toBeGreaterThan(0);
    for (const f of hashed) {
      expect(headers).toContain(
        `/${basename(f)}\n  Cache-Control: public, max-age=31536000, immutable\n`,
      );
    }
    expect(headers).not.toContain(".html");
  });
});
