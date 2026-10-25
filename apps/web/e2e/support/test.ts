import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test as base } from "@playwright/test";

// Playwright's test, recording what each test runs (the e2e map): with
// E2E_COVERAGE=1, in Chromium, the scripts' functions the page ran, by file
// and offset, one file per test. `bun tooling/scripts/e2e-map.ts build`
// turns them into the map the pre-push hook picks tests from. Specs import
// `test` from here; one that doesn't is never mapped, so it always runs.

export { expect, type Locator, type Page } from "@playwright/test";

const ON = process.env.E2E_COVERAGE === "1";
export const COVERAGE_DIR = "test-results/coverage";

export const test = base.extend<{ coverage: undefined }>({
  coverage: [
    async ({ page, browserName }, use, info) => {
      const record = ON && browserName === "chromium";
      if (record)
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use(undefined);
      if (!record || page.isClosed()) return;
      const scripts: Record<string, [number, number][]> = {};
      for (const entry of await page.coverage.stopJSCoverage()) {
        const { pathname, hostname } = new URL(entry.url);
        if (hostname !== "localhost" || !pathname.endsWith(".js")) continue;
        const ran: [number, number][] = [];
        for (const { ranges } of entry.functions) {
          const r = ranges[0];
          if (r && r.count > 0) ran.push([r.startOffset, r.endOffset]);
        }
        scripts[pathname.slice(1)] = ran;
      }
      mkdirSync(COVERAGE_DIR, { recursive: true });
      writeFileSync(
        join(COVERAGE_DIR, `${info.testId}-${info.project.name}.json`),
        JSON.stringify({ spec: info.file, scripts }),
      );
    },
    { auto: true },
  ],
});
