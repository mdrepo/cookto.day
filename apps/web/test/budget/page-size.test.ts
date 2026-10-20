import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite } from "../../scripts/build.js";

// People open cookto.day on a phone, often on mobile data, standing in the
// kitchen. So every page stays small (ADR 0013). Budgets are for what we
// ship, gzipped. React is paid for once: it has a file of its own that
// browsers keep for a year (ADR 0018), so our own code has the tight budget.
// If a change needs more, don't raise a budget: make the change smaller, or
// stop and ask a code owner.
const BUDGET_KB = {
  /** Each HTML page plus all stylesheets. */
  pageAndStyles: 8,
  /**
   * Our own JavaScript that a first visit loads: everything but React's
   * file. Until 14 Oct it counted every script, even ones loaded later; it
   * was 36 then (20 before the kitchen, specs/72). 35 until 20 Oct, when
   * the owner raised it to 50 for the cook's words (specs/207); the page
   * was 35.2 then.
   */
  ourScripts: 50,
  /**
   * A first visit, nothing cached: pages, styles and the scripts the page
   * loads. Until 14 Oct it counted every script; it was 120 then.
   */
  firstVisit: 120,
  /** Each script loaded later, like a cuisine pack when one is picked. */
  laterFile: 8,
};

/** Only React's production build links its error codes here. */
const REACT = "react.dev/errors";
/** Only our code has this storage key in it. */
const OURS = "cookto.day:language";

let outdir = "";
let files: string[] = [];
beforeAll(async () => {
  outdir = mkdtempSync(join(tmpdir(), "cookto-budget-"));
  files = await buildSite(outdir);
});
afterAll(() => {
  rmSync(outdir, { recursive: true, force: true });
});

const gzippedKb = (paths: string[]) =>
  paths.reduce((kb, p) => kb + Bun.gzipSync(readFileSync(p)).length / 1024, 0);
const ofType = (ext: string) => files.filter((f) => f.endsWith(ext));

function withinBudget(what: string, kb: number, budget: number) {
  if (kb > budget) {
    throw new Error(
      `${what} is ${kb.toFixed(1)}KB gzipped, over its ${budget}KB budget. ` +
        `Find what grew and make it smaller. Don't raise the budget: ask a code owner.`,
    );
  }
}

describe("page size budget", () => {
  test("each page with its stylesheets stays within budget", () => {
    for (const page of ofType(".html")) {
      withinBudget(
        page.slice(outdir.length + 1),
        gzippedKb([page, ...ofType(".css")]),
        BUDGET_KB.pageAndStyles,
      );
    }
  });

  const scripts = () => ofType(".js");
  const isReact = (f: string) => readFileSync(f, "utf8").includes(REACT);

  /**
   * The scripts a first visit loads: the pages' scripts and preloads, and
   * what they import, but not what they import later (`import("…")`).
   */
  const loadedFirst = () => {
    const at = (name: string) => join(outdir, name.replace(/^\.\//, ""));
    const queue = ofType(".html").flatMap((page) =>
      [
        ...readFileSync(page, "utf8").matchAll(
          /<(?:script[^>]*\ssrc|link[^>]*modulepreload[^>]*\shref)="(\.\/[^"]+\.js)"/g,
        ),
      ].map((m) => at(m[1] ?? "")),
    );
    const seen = new Set<string>();
    for (let f = queue.pop(); f; f = queue.pop()) {
      if (seen.has(f)) continue;
      seen.add(f);
      for (const m of readFileSync(f, "utf8").matchAll(
        /(?:from|import)\s*"(\.\/[^"]+\.js)"/g,
      ))
        queue.push(at(m[1] ?? ""));
    }
    return [...seen];
  };

  test("a first visit loads some scripts now and others later", () => {
    expect(loadedFirst().length).toBeGreaterThan(0);
    expect(loadedFirst().length).toBeLessThan(scripts().length);
  });

  test("our own scripts stay within budget", () => {
    withinBudget(
      "Our scripts a first visit loads (all but React's file)",
      gzippedKb(loadedFirst().filter((f) => !isReact(f))),
      BUDGET_KB.ourScripts,
    );
  });

  test("a first visit stays within budget", () => {
    withinBudget(
      "A first visit (pages, styles and the scripts they load)",
      gzippedKb([...ofType(".html"), ...ofType(".css"), ...loadedFirst()]),
      BUDGET_KB.firstVisit,
    );
  });

  test("each script loaded later stays within budget", () => {
    const first = new Set(loadedFirst());
    for (const f of scripts().filter((s) => !first.has(s)))
      withinBudget(
        f.slice(outdir.length + 1),
        gzippedKb([f]),
        BUDGET_KB.laterFile,
      );
  });

  test("React has a file of its own, so it stays cached when our code changes", () => {
    const react = scripts().filter(isReact);
    expect(react).toHaveLength(1);
    const [file = ""] = react;
    expect(readFileSync(file, "utf8")).not.toContain(OURS);
  });

  test("no page loads anything from another site", () => {
    const external = ofType(".html").flatMap((page) =>
      [
        ...readFileSync(page, "utf8").matchAll(
          /<(?:script|link|img|iframe)[^>]*\s(?:src|href)="((?:https?:)?\/\/[^"]+)"/g,
        ),
      ].map((m) => `${page}: ${m[1] ?? ""}`),
    );
    expect(external).toEqual([]);
  });
});
