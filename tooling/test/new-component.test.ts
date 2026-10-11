import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { copyRepo, run } from "./repo-copy.js";

// specs/24-new-component.md, run against a copy of the repo, since the
// generator writes files. The spec's example is Button; the test makes
// GeneratedSample, a name no real component will take, because Button now
// exists.

let repo: { dir: string; remove: () => void };
let made: { code: number; output: string };
beforeAll(() => {
  repo = copyRepo();
  made = run(repo.dir, ["bun", "run", "new", "component", "GeneratedSample"]);
});
afterAll(() => {
  repo.remove();
});

const at = (path: string) => join(repo.dir, path);
const SLOW = { timeout: 120_000 };

describe("bun run new component", () => {
  test(
    "a new component starts with every file it needs",
    () => {
      expect(made.code, made.output).toBe(0);
      for (const file of [
        "packages/ui/src/components/GeneratedSample/GeneratedSample.tsx",
        "packages/ui/src/components/GeneratedSample/GeneratedSample.module.css",
        "packages/ui/src/components/GeneratedSample/GeneratedSample.kit.tsx",
        "packages/ui/test/GeneratedSample.test.tsx",
      ])
        expect(existsSync(at(file)), file).toBe(true);
      expect(readFileSync(at("DESIGN.md"), "utf8")).toContain(
        "`GeneratedSample`",
      );
      expect(readFileSync(at("packages/ui/src/index.ts"), "utf8")).toMatch(
        /export \{[^}]*\bGeneratedSample\b[^}]*\} from "\.\/components\/GeneratedSample\/GeneratedSample\.js"/,
      );

      for (const check of [
        ["bun", "tooling/scripts/check-design.ts"],
        ["bun", "tooling/scripts/check-file-size.ts"],
        ["bunx", "tsc", "--noEmit", "-p", "packages/ui"],
        [
          "bunx",
          "eslint",
          "packages/ui/src/components/GeneratedSample",
          "packages/ui/test/GeneratedSample.test.tsx",
          "packages/ui/src/index.ts",
        ],
        [
          "bunx",
          "prettier",
          "--check",
          "DESIGN.md",
          "packages/ui/src",
          "packages/ui/test",
        ],
      ]) {
        const result = run(repo.dir, check);
        expect(result.code, `${check.join(" ")}\n${result.output}`).toBe(0);
      }
    },
    SLOW,
  );

  test(
    "a new component's test fails until it's built",
    () => {
      const result = run(repo.dir, [
        "bun",
        "test",
        "./packages/ui/test/GeneratedSample.test.tsx",
      ]);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain("GeneratedSample renders nothing yet");
    },
    SLOW,
  );

  test(
    "a name that's taken, or not a component name, is refused",
    () => {
      const before = readFileSync(at("DESIGN.md"), "utf8");

      const taken = run(repo.dir, ["bun", "run", "new", "component", "Select"]);
      expect(taken.code).not.toBe(0);
      expect(taken.output).toContain("Select already exists");

      const lower = run(repo.dir, ["bun", "run", "new", "component", "button"]);
      expect(lower.code).not.toBe(0);
      expect(lower.output).toContain("starts with a capital letter");
      // By name, not existsSync: macOS ignores case in file names.
      expect(readdirSync(at("packages/ui/src/components"))).not.toContain(
        "button",
      );

      expect(readFileSync(at("DESIGN.md"), "utf8")).toBe(before);
    },
    SLOW,
  );
});
