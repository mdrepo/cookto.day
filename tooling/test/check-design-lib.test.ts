import { describe, expect, test } from "bun:test";
import { designProblems } from "../scripts/check-design-lib.js";

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
  });

  test("ignores ids and words that only look like colours", () => {
    expect(problems("#pantry { display: none; }")).toEqual([]);
    expect(problems("// Fixes #123, see the red button")).toEqual([]);
  });

  test("reports the line", () => {
    expect(designProblems(".a {}\n.b { color: #000; }")[0]?.line).toBe(2);
  });
});
