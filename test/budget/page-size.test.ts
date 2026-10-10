import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite } from "../../scripts/build.js";

// People open cookto.day on a phone, often on mobile data, standing in the
// kitchen. So every page stays small (ADR 0013). Budgets are for what we
// ship, gzipped, per page and in total. They leave room to grow, but not for
// a framework. If a change needs more, don't raise a budget: make the change
// smaller, or stop and ask a code owner.
const BUDGET_KB = {
  /** Each HTML page plus all stylesheets. */
  pageAndStyles: 8,
  /** All JavaScript the site ships. */
  scripts: 20,
};

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

  test("the site's scripts stay within budget", () => {
    withinBudget("All scripts", gzippedKb(ofType(".js")), BUDGET_KB.scripts);
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
