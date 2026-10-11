import { describe, expect, test } from "bun:test";
import {
  appCssProblems,
  componentProblems,
  designProblems,
  iconProblems,
  tokenDefinitions,
} from "../scripts/check-design-lib.js";

const problems = (css: string) => designProblems(css).map((p) => p.text);

describe("designProblems", () => {
  test("allows the variables, logical properties and 4px steps", () => {
    expect(
      problems(
        ".a { color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); font-size: var(--text-md); font-weight: 600; border-radius: var(--radius-md); padding-inline: 16px; margin-block-start: var(--space-2); font-family: var(--font-body); }",
      ),
    ).toEqual([]);
  });

  test("rejects colour values, in CSS and in TypeScript", () => {
    expect(problems(".a { color: #fff; }")).toHaveLength(1);
    expect(problems(".a { background: rgba(0, 0, 0, 0.5); }")).toHaveLength(1);
    expect(problems(".a { border: 1px solid red; }")).toHaveLength(1);
    expect(problems("el.style.backgroundColor = '#abcdef';")).toHaveLength(1);
    expect(problems(".a { color: var(--color-text, #f0f0f0); }")).toHaveLength(
      1,
    );
  });

  test("allows raw values where the variables are defined, light and dark", () => {
    expect(
      problems(
        ":root {\n  --color-bg: #fbf7f0;\n  --text-md: 1rem;\n}\n@media (prefers-color-scheme: dark) {\n  :root { --color-bg: #1c1a17; }\n}",
      ),
    ).toEqual([]);
  });

  test("rejects sizes, weights, corners and fonts off the tokens", () => {
    expect(problems(".a { font-size: 17px; }")).toHaveLength(1);
    expect(problems(".a { font-weight: 800; }")).toHaveLength(1);
    expect(problems(".a { border-radius: 6px; }")).toHaveLength(1);
    expect(problems(".a { font-family: Inter, sans-serif; }")).toHaveLength(1);
  });

  test("rejects spacing that isn't a step of 4px", () => {
    expect(problems(".a { padding: 8px 10px; }")).toHaveLength(1);
    expect(problems(".a { gap: 6px; }")).toHaveLength(1);
    expect(problems(".a { margin: 0 auto; gap: 12px; }")).toEqual([]);
  });

  test("rejects physical left and right, which break Arabic", () => {
    expect(problems(".a { margin-left: 8px; }")).toHaveLength(1);
    expect(problems(".a { padding-right: 8px; }")).toHaveLength(1);
    expect(problems(".a { text-align: left; }")).toHaveLength(1);
    expect(problems(".a { position: absolute; right: 0; }")).toHaveLength(1);
    expect(problems("el.style.marginLeft = '4px';")).toHaveLength(1);
    expect(problems(".a { text-align: start; inset-inline-end: 0; }")).toEqual(
      [],
    );
  });

  test("rejects fonts and files from other sites", () => {
    expect(problems("@import url(https://fonts.example/x.css);")).toHaveLength(
      1,
    );
    expect(problems("@font-face { font-family: X; }")).not.toHaveLength(0);
    expect(problems('@import "//cdn.example/x.css";')).toHaveLength(1);
  });

  test("allows importing the design system's own stylesheets", () => {
    expect(problems('@import "@cookto/ui/tokens.css";')).toEqual([]);
    expect(problems('@import "./parts.css";')).toEqual([]);
  });

  test("ignores ids and words that only look like colours", () => {
    expect(problems("#pantry { display: none; }")).toEqual([]);
    expect(problems("// Fixes #123, see the red button")).toEqual([]);
  });

  test("reports the line", () => {
    expect(designProblems(".a {}\n.b { color: #000; }")[0]?.line).toBe(2);
  });
});

describe("tokenDefinitions", () => {
  test("finds CSS variables defined outside the generated tokens", () => {
    expect(
      tokenDefinitions(":root {\n  --color-bg: #fff;\n}").map((p) => p.line),
    ).toEqual([2]);
    expect(tokenDefinitions(".a { --gap: 4px; }")).toHaveLength(1);
    expect(
      tokenDefinitions(".a { color: var(--color-text); gap: var(--space-2); }"),
    ).toEqual([]);
  });
});

describe("componentProblems", () => {
  const complete = {
    name: "Select",
    files: ["Select.tsx", "Select.module.css", "Select.kit.tsx"],
  };
  const design = "| A choice | `Select` | ... |";

  test("a component with its files, test and DESIGN.md row passes", () => {
    expect(componentProblems([complete], ["Select.test.tsx"], design)).toEqual(
      [],
    );
  });

  test("names each missing file", () => {
    const found = componentProblems(
      [{ name: "Select", files: ["Select.tsx"] }],
      [],
      design,
    ).join("\n");
    expect(found).toContain("Select.module.css");
    expect(found).toContain("Select.kit.tsx");
    expect(found).toContain("packages/ui/test/Select.test.tsx");
  });

  test("needs a row in DESIGN.md", () => {
    expect(
      componentProblems([complete], ["Select.test.tsx"], "no rows").join("\n"),
    ).toContain("DESIGN.md");
  });
});

describe("iconProblems", () => {
  test("only the Icon component may import Lucide", () => {
    const source = 'import { Carrot } from "lucide-react";';
    expect(
      iconProblems("packages/ui/src/components/Icon/Icon.tsx", source),
    ).toEqual([]);
    expect(
      iconProblems("packages/ui/src/components/Card/Card.tsx", source),
    ).toHaveLength(1);
    expect(iconProblems("apps/web/src/app.tsx", source)).toHaveLength(1);
  });

  test("apps draw no SVG of their own: icons come from Icon", () => {
    expect(
      iconProblems("apps/web/src/app.tsx", '<svg viewBox="0 0 24 24" />'),
    ).toHaveLength(1);
    expect(
      iconProblems("apps/web/src/app.tsx", '<Icon name="carrot" />'),
    ).toEqual([]);
  });
});

describe("appCssProblems", () => {
  test("an app's own CSS fails: apps compose, they don't style", () => {
    const [problem] = appCssProblems(["apps/web/src/styles.css"]);
    expect(problem).toContain("apps/web/src/styles.css");
    expect(problem).toContain("@cookto/ui");
  });

  test("the kit page's frame, and the design system's own CSS, pass", () => {
    expect(
      appCssProblems([
        "apps/kit/src/kit.css",
        "packages/ui/src/foundation.css",
        "packages/ui/src/layouts/Stack/Stack.module.css",
        "apps/web/src/app.tsx",
      ]),
    ).toEqual([]);
  });
});

describe("componentProblems for layouts", () => {
  test("names the layout's own folder", () => {
    const found = componentProblems(
      [{ name: "Stack", files: ["Stack.tsx"] }],
      [],
      "`Stack`",
      "packages/ui/src/layouts",
    ).join("\n");
    expect(found).toContain("packages/ui/src/layouts/Stack/Stack.kit.tsx");
  });
});
