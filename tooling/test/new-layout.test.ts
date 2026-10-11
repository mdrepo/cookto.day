import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { copyRepo, run } from "./repo-copy.js";

// specs/33-layouts.md, criterion 6, run against a copy of the repo, since the
// generator writes files. Grid: a layout name no real layout takes yet.

let repo: { dir: string; remove: () => void };
let made: { code: number; output: string };
beforeAll(() => {
  repo = copyRepo();
  made = run(repo.dir, ["bun", "run", "new", "layout", "Grid"]);
});
afterAll(() => {
  repo.remove();
});

const at = (path: string) => join(repo.dir, path);

describe("bun run new layout", () => {
  test(
    "a new layout starts with every file it needs",
    () => {
      expect(made.code, made.output).toBe(0);
      for (const file of [
        "packages/ui/src/layouts/Grid/Grid.tsx",
        "packages/ui/src/layouts/Grid/Grid.module.css",
        "packages/ui/src/layouts/Grid/Grid.kit.tsx",
        "packages/ui/test/Grid.test.tsx",
      ])
        expect(existsSync(at(file)), file).toBe(true);
      expect(readFileSync(at("DESIGN.md"), "utf8")).toContain("`Grid`");
      expect(readFileSync(at("packages/ui/src/index.ts"), "utf8")).toMatch(
        /export \{[^}]*\bGrid\b[^}]*\} from "\.\/layouts\/Grid\/Grid\.js"/,
      );

      const test = run(repo.dir, [
        "bun",
        "test",
        "./packages/ui/test/Grid.test.tsx",
      ]);
      expect(test.code).not.toBe(0);
      expect(test.output).toContain("Grid renders nothing yet");

      for (const check of [
        ["bun", "tooling/scripts/check-design.ts"],
        ["bun", "tooling/scripts/check-file-size.ts"],
        ["bunx", "tsc", "--noEmit", "-p", "packages/ui"],
        [
          "bunx",
          "eslint",
          "packages/ui/src/layouts/Grid",
          "packages/ui/test/Grid.test.tsx",
        ],
      ]) {
        const result = run(repo.dir, check);
        expect(result.code, `${check.join(" ")}\n${result.output}`).toBe(0);
      }
    },
    { timeout: 120_000 },
  );
});
