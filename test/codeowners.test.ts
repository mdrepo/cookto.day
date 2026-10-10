import { describe, expect, test } from "bun:test";
import { askRules, isOwned, ownedPaths } from "../scripts/codeowners.js";

const codeowners = `# Comment
/package.json        @a @b

/.github/            @a
/scripts/build.ts  @a
`;

describe("ownedPaths", () => {
  test("reads paths, ignoring comments and blank lines", () => {
    expect(ownedPaths(codeowners)).toEqual([
      "package.json",
      ".github/",
      "scripts/build.ts",
    ]);
  });
});

describe("isOwned", () => {
  const owned = ownedPaths(codeowners);

  test.each([
    [".github/workflows/ci.yml", true],
    ["package.json", true],
    ["scripts/build.ts", true],
    ["scripts/build.tsx", false],
    ["src/package.json", false],
    [".githubx/a", false],
  ] as [string, boolean][])("%p is owned: %p", (path, expected) => {
    expect(isOwned(path, owned)).toBe(expected);
  });
});

describe("askRules", () => {
  test("protects directories recursively and files exactly", () => {
    expect(askRules(["e2e/", "package.json"])).toEqual([
      "Edit(e2e/**)",
      "Edit(package.json)",
    ]);
  });
});
