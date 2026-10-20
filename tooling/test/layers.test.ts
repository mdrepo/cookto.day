import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { layers } from "../scripts/eslint-layers.js";

// specs/45-layers.md: each layer imports only what it may (ADR 0022). Each
// test lints a few lines as if they sat in a given file, with the layer rules
// alone, so it's fast and checks exactly those rules.

const ROOT = join(import.meta.dir, "../..");

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: { parser: tseslint.parser },
    },
    ...layers,
  ],
});

/** The lint messages for `code`, as if it were the file at `path`. */
async function problems(path: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: join(ROOT, path),
  });
  return (result?.messages ?? []).map((m) => m.message);
}

const SCREEN = "apps/web/src/features/pantry/PantryScreen.tsx";
const HOOK = "apps/web/src/features/pantry/usePantryScreen.ts";

describe("layers", () => {
  test.each([
    "@cookto/data",
    "@cookto/data/read",
    "@cookto/usecases",
    "zustand",
    "@tanstack/react-query",
  ])("a screen can't reach data or use cases: %s", async (from) => {
    const found = await problems(SCREEN, `import { x } from "${from}";`);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("ADR 0022");
    expect(found[0]).toContain("use*.ts");
  });

  test("a screen may use the kit and its own hook", async () => {
    expect(
      await problems(
        SCREEN,
        `import { Button } from "@cookto/ui";\nimport { usePantryScreen } from "./usePantryScreen";`,
      ),
    ).toEqual([]);
  });

  test("only use cases write data", async () => {
    const found = await problems(
      HOOK,
      `import { x } from "@cookto/data/write";`,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("use case");
    expect(found[0]).toContain("ADR 0022");
    expect(
      await problems(
        HOOK,
        `import { x } from "@cookto/data/read";\nimport { y } from "@cookto/usecases";`,
      ),
    ).toEqual([]);
    expect(
      await problems(
        "packages/usecases/src/pantry.ts",
        `import { x } from "@cookto/data/write";`,
      ),
    ).toEqual([]);
  });

  test.each([
    ["packages/usecases/src/pantry.ts", "react"],
    ["packages/usecases/src/pantry.ts", "@tanstack/react-query"],
    ["packages/data/src/pantry.ts", "zustand"],
    ["packages/data/src/pantry.ts", "react-dom"],
    ["packages/engine/src/plan.ts", "@cookto/ui"],
  ])(
    "use cases, data and the engine have no React: %s imports %s",
    async (file, from) => {
      const found = await problems(file, `import { x } from "${from}";`);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("without React");
      expect(found[0]).toContain("ADR 0022");
    },
  );

  test("data may keep its store with zustand/vanilla", async () => {
    expect(
      await problems(
        "packages/data/src/store.ts",
        `import { createStore } from "zustand/vanilla";`,
      ),
    ).toEqual([]);
  });

  test.each([
    ["packages/engine/src/plan.ts", "@cookto/data"],
    ["packages/data/src/pantry.ts", "@cookto/usecases"],
    ["packages/usecases/src/pantry.ts", "@cookto/web"],
  ])(
    "each package imports only the layers below it: %s imports %s",
    async (file, from) => {
      const found = await problems(file, `import { x } from "${from}";`);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("may import");
      expect(found[0]).toContain("ADR 0022");
    },
  );

  test("the layers below may import what they're allowed", async () => {
    expect(
      await problems(
        "packages/data/src/pantry.ts",
        `import { daysLeft } from "@cookto/engine";`,
      ),
    ).toEqual([]);
    expect(
      await problems(
        "packages/usecases/src/pantry.ts",
        `import { daysLeft } from "@cookto/engine";\nimport { addBill } from "./bills";`,
      ),
    ).toEqual([]);
  });

  test.each([
    ["apps/web/src/features/pantry/PantryScreen.tsx", "../plan/usePlanScreen"],
    [
      "apps/web/src/features/pantry/rows/PantryRow.tsx",
      "../../plan/PlanScreen",
    ],
  ])(
    "features don't reach into each other: %s imports %s",
    async (file, from) => {
      const found = await problems(file, `import { x } from "${from}";`);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("moves down a layer");
      expect(found[0]).toContain("ADR 0022");
    },
  );

  test("a feature may import its own files and the app's words", async () => {
    expect(
      await problems(
        "apps/web/src/features/pantry/PantryScreen.tsx",
        `import { words } from "../../i18n";\nimport { Row } from "./rows/PantryRow";`,
      ),
    ).toEqual([]);
    expect(
      await problems(
        "apps/web/src/features/pantry/rows/PantryRow.tsx",
        `import { usePantryRow } from "../usePantryRow";\nimport { words } from "../../../i18n";`,
      ),
    ).toEqual([]);
  });

  test("only the API and the database import the messenger (ADR 0031)", async () => {
    // Data and use cases already may import nothing above them, so their own
    // rule answers there; the app's other files need this one.
    const line = `import { createMessenger } from "@cookto/messenger";`;
    for (const file of [
      "apps/web/src/platform.ts",
      "apps/web/src/features/settings/useCookLink.ts",
      "apps/web/src/features/settings/CookLink.tsx",
    ]) {
      const found = await problems(file, line);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("ADR 0031");
    }
    expect(await problems("apps/api/src/index.ts", line)).toEqual([]);
    expect(await problems("db/src/store.ts", line)).toEqual([]);
  });

  test.each(["react", "@cookto/engine", "@cookto/data", "@cookto/usecases"])(
    "the messenger can't import %s (ADR 0031)",
    async (from) => {
      const found = await problems(
        "packages/messenger/src/telegram.ts",
        `import { x } from "${from}";`,
      );
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("ADR 0022");
    },
  );
});

describe("the new packages exist", () => {
  const read = (path: string): unknown =>
    JSON.parse(readFileSync(join(ROOT, path), "utf8"));

  test("each package exports what it declares, without the browser's own types", () => {
    // One test, its table inside and nothing before its name: tdd:verify
    // reads a test from its declaration to the next, so a line above the
    // name would count for the test above.
    const packages: [string, string, string[]][] = [
      [
        "packages/usecases",
        "@cookto/usecases",
        [".", "./cook", "./signin", "./household-sync"],
      ],
      [
        "packages/data",
        "@cookto/data",
        [".", "./read", "./write", "./network", "./sync"],
      ],
      ["packages/messenger", "@cookto/messenger", [".", "./contract"]],
    ];
    for (const [dir, name, entries] of packages) {
      const pkg = read(`${dir}/package.json`) as {
        name: string;
        exports: Record<string, string>;
      };
      expect(pkg.name).toBe(name);
      expect(Object.keys(pkg.exports).sort()).toEqual([...entries].sort());
      for (const file of Object.values(pkg.exports))
        expect(existsSync(join(ROOT, dir, file))).toBe(true);
      const tsconfig = read(`${dir}/tsconfig.json`) as {
        compilerOptions: { lib: string[] };
      };
      expect(tsconfig.compilerOptions.lib).toEqual(["ES2022"]);
    }
  });
});
