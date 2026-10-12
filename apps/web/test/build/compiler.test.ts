import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite } from "../../scripts/build.js";

// specs/48-compiler.md: React Compiler memoises the app (ADR 0023), so nobody
// writes useMemo by hand. Compiled components keep their values in React's
// memo cache, which only compiled code asks for: React's own file has the
// cache, but without the compiler our code never calls it.

const MEMO_CACHE = "useMemoCache";
/** Only React's production build links its error codes here. */
const REACT = "react.dev/errors";

let outdir = "";
let files: string[] = [];
beforeAll(async () => {
  outdir = mkdtempSync(join(tmpdir(), "cookto-compiler-"));
  files = await buildSite(outdir);
});
afterAll(() => {
  rmSync(outdir, { recursive: true, force: true });
});

describe("React Compiler", () => {
  test("the app is memoised without anyone writing it", () => {
    const ours = files
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(f, "utf8"))
      .filter((js) => !js.includes(REACT));
    expect(ours.length).toBeGreaterThan(0);
    expect(ours.some((js) => js.includes(MEMO_CACHE))).toBe(true);
  });
});
