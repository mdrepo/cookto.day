import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { storage } from "../scripts/eslint-storage.js";

// specs/51-settings.md, criterion 3: only packages/data, and the one app file
// that hands it the browser's storage, touch storage or the network (ADR
// 0024). Each test lints a line as if it sat in a given file, with these
// rules alone.

const ROOT = join(import.meta.dir, "../..");

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: { parser: tseslint.parser },
    },
    ...storage,
  ],
});

async function problems(path: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
  return (result?.messages ?? []).map((m) => m.message);
}

const ELSEWHERE = [
  "apps/web/src/features/settings/LanguagePicker.tsx",
  "apps/web/src/features/settings/useLanguage.ts",
  "apps/web/src/app.tsx",
  "packages/usecases/src/settings.ts",
  "packages/engine/src/expiry.ts",
  "packages/ui/src/components/Field/Field.tsx",
];

const CALLS = [
  `localStorage.getItem("x");`,
  `sessionStorage.setItem("x", "y");`,
  `indexedDB.open("x");`,
  `void fetch("/api");`,
  `new XMLHttpRequest();`,
  `new WebSocket("wss://x");`,
  `navigator.sendBeacon("/api");`,
  `window.localStorage.getItem("x");`,
  `globalThis.fetch("/api");`,
];

describe("only data touches storage or the network", () => {
  test.each(ELSEWHERE)("%s can't", async (file) => {
    for (const code of CALLS) {
      const found = await problems(file, code);
      expect(found, code).toHaveLength(1);
      expect(found[0]).toContain("packages/data");
      expect(found[0]).toContain("apps/web/src/platform.ts");
      expect(found[0]).toContain("ADR 0024");
    }
  });

  test.each(["packages/data/src/kv.ts", "apps/web/src/platform.ts"])(
    "%s can",
    async (file) => {
      for (const code of CALLS) expect(await problems(file, code)).toEqual([]);
    },
  );
});

describe("the browser's storage for data", () => {
  test("packages/data-web may touch storage", async () => {
    for (const code of CALLS)
      expect(
        await problems("packages/data-web/src/indexeddb.ts", code),
      ).toEqual([]);
  });
});
