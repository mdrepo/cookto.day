import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { syntax } from "../scripts/eslint-syntax.js";

// specs/48-compiler.md: React Compiler memoises, so lint stops memoising by
// hand (ADR 0023); React's compiler rules run; and a focused test is caught
// in .tsx files as in .ts files (ADR 0003). Each test lints a few lines as if
// they sat in a given file, with these rules alone.

const ROOT = join(import.meta.dir, "../..");

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: { parser: tseslint.parser },
    },
    ...syntax,
  ],
});

/** The problems in `code`, as if it were the file at `path`. */
async function problems(
  path: string,
  code: string,
): Promise<{ rule: string | null; message: string }[]> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, path) });
  return (result?.messages ?? []).map((m) => ({
    rule: m.ruleId,
    message: m.message,
  }));
}

const COMPONENT = "packages/ui/src/components/Sample/Sample.tsx";
const HOOK = "apps/web/src/features/pantry/usePantryScreen.ts";

describe("memoising by hand", () => {
  test.each([
    [
      COMPONENT,
      `import { useMemo } from "react";\nexport function Sample({ n }: { n: number }) {\n  const d = useMemo(() => n * 2, [n]);\n  return <p>{d}</p>;\n}`,
    ],
    [
      HOOK,
      `import { useCallback } from "react";\nexport function usePantryScreen() {\n  return useCallback(() => 1, []);\n}`,
    ],
    [
      COMPONENT,
      `import { memo } from "react";\nexport const Sample = memo(function Sample() {\n  return <p />;\n});`,
    ],
    [
      COMPONENT,
      `import React from "react";\nexport const Sample = React.memo(function Sample() {\n  return <p />;\n});`,
    ],
  ])("fails lint, saying the compiler does it: %s", async (file, code) => {
    const found = (await problems(file, code)).filter(
      (p) => p.rule === "no-restricted-syntax",
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain("React Compiler");
    expect(found[0]?.message).toContain("ADR 0023");
  });
});

describe("React's compiler rules", () => {
  test("setting state in an effect to work out a value fails", async () => {
    const found = await problems(
      COMPONENT,
      `import { useEffect, useState } from "react";\nexport function Sample({ n }: { n: number }) {\n  const [d, setD] = useState(0);\n  useEffect(() => {\n    setD(n * 2);\n  }, [n]);\n  return <p>{d}</p>;\n}`,
    );
    expect(found.map((p) => p.rule)).toContain(
      "react-hooks/set-state-in-effect",
    );
  });

  test("reading a ref while rendering fails", async () => {
    const found = await problems(
      COMPONENT,
      `import { useRef } from "react";\nexport function Sample() {\n  const r = useRef(0);\n  return <p>{r.current}</p>;\n}`,
    );
    expect(found.map((p) => p.rule)).toContain("react-hooks/refs");
  });
});

describe("a focused test", () => {
  test.each([
    "packages/ui/test/Button.test.tsx",
    "packages/engine/test/expiry.test.ts",
  ])("is caught in %s", async (file) => {
    for (const code of [
      `test.only("x", () => {});`,
      `describe.skip("x", () => {});`,
    ]) {
      const found = (await problems(file, code)).filter(
        (p) => p.rule === "no-restricted-syntax",
      );
      expect(found).toHaveLength(1);
      expect(found[0]?.message).toContain("ADR 0003");
    }
  });
});
