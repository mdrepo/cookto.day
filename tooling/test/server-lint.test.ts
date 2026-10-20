import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { server } from "../scripts/eslint-server.js";
import { storage } from "../scripts/eslint-storage.js";

// ADR 0028: the API reaches the network only from its AI adapter, and logs
// only through its log helper. Each test lints a line as if it sat in a
// given file, with the storage rules and these, in eslint.config.js's order.

const ROOT = join(import.meta.dir, "../..");

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts"],
      languageOptions: { parser: tseslint.parser },
    },
    ...storage,
    ...server,
  ],
});

async function problems(path: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
  return (result?.messages ?? []).map((m) => m.message);
}

const NETWORK = [
  `void fetch("https://example.com");`,
  `void globalThis.fetch("https://example.com");`,
  `new WebSocket("wss://example.com");`,
  `new EventSource("https://example.com");`,
];
const CONSOLE = [
  `console.log("x");`,
  `console.error("x");`,
  `console.info("x");`,
];

describe("the API's network and logs", () => {
  test("elsewhere in the API, neither the network nor console", async () => {
    for (const file of [
      "apps/api/src/router.ts",
      "apps/api/src/usage/ledger.ts",
      "apps/api/src/receipts/gemini.ts",
      "apps/api/src/messenger/postgrest.ts",
    ]) {
      for (const code of NETWORK) {
        const found = await problems(file, code);
        expect(found, code).toHaveLength(1);
        expect(found[0]).toContain("apps/api/src/network.ts");
      }
      for (const code of CONSOLE) {
        const found = await problems(file, code);
        expect(found, code).toHaveLength(1);
        expect(found[0]).toContain("apps/api/src/log.ts");
      }
    }
  });

  test("the network file may call fetch, and nothing else", async () => {
    const file = "apps/api/src/network.ts";
    expect(await problems(file, `void fetch("https://example.com");`)).toEqual(
      [],
    );
    expect(
      await problems(file, `new WebSocket("wss://example.com");`),
    ).toHaveLength(1);
    expect(await problems(file, `console.log("x");`)).toHaveLength(1);
  });

  test("the log helper may use console, and no network", async () => {
    const file = "apps/api/src/log.ts";
    expect(await problems(file, `console.log("x");`)).toEqual([]);
    expect(
      await problems(file, `void fetch("https://example.com");`),
    ).toHaveLength(1);
  });
});
