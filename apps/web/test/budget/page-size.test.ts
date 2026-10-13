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
   * All our own JavaScript: everything but React's file. 20 until the
   * kitchen (specs/72), 35 until the prototype's layout and Settings (#84).
   */
  ourScripts: 36,
  /**
   * A first visit, nothing cached: pages, styles and every script. 100 until
   * the kitchen (specs/72), 115 until the prototype's look (specs/80). It
   * counts the cuisine pack too, which only loads when one is picked.
   */
  firstVisit: 120,
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

  test("our own scripts stay within budget", () => {
    withinBudget(
      "Our scripts (all but React's file)",
      gzippedKb(scripts().filter((f) => !isReact(f))),
      BUDGET_KB.ourScripts,
    );
  });

  test("a first visit stays within budget", () => {
    withinBudget(
      "A first visit (pages, styles and every script)",
      gzippedKb([...ofType(".html"), ...ofType(".css"), ...scripts()]),
      BUDGET_KB.firstVisit,
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
