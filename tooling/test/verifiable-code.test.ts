import { describe, expect, test } from "bun:test";
import { isVerifiableCode } from "../scripts/pr-rules.js";

// tdd:verify runs a branch's new tests against main's code, swapping in
// main's version of every file this says is code. An app's build script is
// code too: before #48 it wasn't swapped, so a test of a build change passed
// "on main" with the branch's build (ADR 0002).

describe("isVerifiableCode", () => {
  test.each([
    ["apps/web/src/app.tsx", true],
    ["packages/data/src/read.ts", true],
    ["apps/web/scripts/build.ts", true],
    ["apps/kit/scripts/build.ts", true],
    ["tooling/scripts/tdd-verify.ts", true],
    ["apps/web/test/build/site.test.ts", false],
    ["apps/web/e2e/iphone.spec.ts", false],
    ["tooling/test/layers.test.ts", false],
    ["docs/adr/0023-state-and-rerenders.md", false],
    ["package.json", false],
  ])("%s is code tdd:verify swaps: %p", (file, expected) => {
    expect(isVerifiableCode(file)).toBe(expected);
  });
});
