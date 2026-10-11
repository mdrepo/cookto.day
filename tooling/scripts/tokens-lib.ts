// Pure parts of the design tokens (ADR 0019), with unit tests. The source is
// packages/ui/tokens/*.tokens.json, in the W3C Design Tokens (DTCG) shape:
// groups, `$value`, `$type`, `$description`, `{aliases}`. Colours are hex
// strings, as most token tools read them.
//
//   palette  the colours, by name; only the other files use them
//   base     type, corners, spacing: the same in light and dark
//   light    what each colour is for, as an alias into the palette
//   dark     the same names, for a dark system

type Tree = Record<string, unknown>;

export interface TokenSources {
  palette: Tree;
  base: Tree;
  light: Tree;
  dark: Tree;
}

interface Token {
  path: string;
  type: string | undefined;
  value: unknown;
  description: string | undefined;
  contrast: { on: string[]; min: number } | undefined;
}

const CONTRAST_KEY = "day.cookto.contrast";
/** WCAG AA for body text. */
const AA = 4.5;
/** The base groups DESIGN.md shows as tables, besides colour. */
const TABLE_GROUPS = ["text", "radius", "space", "icon"];

const isObject = (v: unknown): v is Tree =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function flatten(tree: Tree, type?: string, prefix: string[] = []): Token[] {
  const groupType = typeof tree.$type === "string" ? tree.$type : type;
  if ("$value" in tree) {
    const ext = isObject(tree.$extensions)
      ? tree.$extensions[CONTRAST_KEY]
      : undefined;
    return [
      {
        path: prefix.join("."),
        type: groupType,
        value: tree.$value,
        description:
          typeof tree.$description === "string" ? tree.$description : undefined,
        contrast: isObject(ext)
          ? {
              on: Array.isArray(ext.on) ? ext.on.map(String) : [],
              min: typeof ext.min === "number" ? ext.min : AA,
            }
          : undefined,
      },
    ];
  }
  return Object.entries(tree)
    .filter(([k, v]) => !k.startsWith("$") && isObject(v))
    .flatMap(([k, v]) => flatten(v as Tree, groupType, [...prefix, k]));
}

const ALIAS = /^\{([^}]+)\}$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG 2 contrast between two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r = 0, g = 0, bl = 0] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/** A semantic colour's hex, or why it has none. */
function resolveColour(
  token: Token,
  palette: Map<string, string>,
): { hex: string } | { problem: string } {
  const value = typeof token.value === "string" ? token.value : "";
  const alias = ALIAS.exec(value);
  if (!alias)
    return {
      problem: `use a palette colour, like {${[...palette.keys()][0] ?? "color.ink"}}, not a raw value`,
    };
  const hex = palette.get(alias[1] ?? "");
  return hex ? { hex } : { problem: `${value} is not in the palette` };
}

/** Everything wrong with the tokens, as messages; empty when they're fine. */
export function tokenProblems(s: TokenSources): string[] {
  const out: string[] = [];
  const files: [string, Tree][] = [
    ["palette", s.palette],
    ["base", s.base],
    ["light", s.light],
    ["dark", s.dark],
  ];
  for (const [file, tree] of files)
    for (const t of flatten(tree))
      if (!t.description)
        out.push(`${t.path} (${file}): add a $description of what it's for`);

  const palette = new Map<string, string>();
  for (const t of flatten(s.palette)) {
    if (typeof t.value === "string" && HEX.test(t.value))
      palette.set(t.path, t.value.toLowerCase());
    else out.push(`${t.path} (palette): use a #rrggbb colour`);
  }

  const themes = { light: flatten(s.light), dark: flatten(s.dark) };
  const names = (ts: Token[]) => new Set(ts.map((t) => t.path));
  for (const [theme, other] of [
    ["light", "dark"],
    ["dark", "light"],
  ] as const) {
    const others = names(themes[other]);
    const missing = [...names(themes[theme])].filter((p) => !others.has(p));
    for (const path of missing)
      out.push(`${path} is in ${theme} but not in ${other}: give it both`);
  }

  for (const theme of ["light", "dark"] as const) {
    const hexes = new Map<string, string>();
    for (const t of themes[theme]) {
      const r = resolveColour(t, palette);
      if ("problem" in r) out.push(`${t.path} (${theme}): ${r.problem}`);
      else hexes.set(t.path, r.hex);
    }
    for (const t of themes[theme]) {
      const fg = hexes.get(t.path);
      if (!t.contrast || !fg) continue;
      for (const on of t.contrast.on) {
        const bg = hexes.get(on);
        if (!bg) {
          out.push(
            `${t.path} (${theme}): contrast is checked on ${on}, which isn't a colour here`,
          );
          continue;
        }
        const ratio = contrastRatio(fg, bg);
        if (ratio < t.contrast.min)
          out.push(
            `${t.path} on ${on} (${theme}): contrast ${ratio.toFixed(2)}, needs ${String(t.contrast.min)} (WCAG AA). Pick palette colours further apart.`,
          );
      }
    }
  }
  return out;
}

const cssVar = (path: string) => `--${path.replaceAll(".", "-")}`;

function cssValue(t: Token, palette: Map<string, string>): string {
  if (Array.isArray(t.value))
    return t.value
      .map(String)
      .map((f) => (/^-?[a-z-]+$/i.test(f) ? f : `"${f}"`))
      .join(", ");
  if (isObject(t.value))
    return `${String(t.value.value)}${String(t.value.unit)}`;
  if (typeof t.value === "string") {
    const alias = ALIAS.exec(t.value);
    return alias ? (palette.get(alias[1] ?? "") ?? t.value) : t.value;
  }
  return String(t.value);
}

function paletteOf(s: TokenSources): Map<string, string> {
  return new Map(
    flatten(s.palette).map((t) => [t.path, String(t.value).toLowerCase()]),
  );
}

/**
 * packages/ui/src/tokens.css: base and light in :root, dark for a dark
 * system, and `data-theme` to force either on part of a page (the kit shows
 * both side by side).
 */
export function renderCss(s: TokenSources): string {
  const palette = paletteOf(s);
  const decl = (ts: Token[], indent: string) =>
    ts.map((t) => `${indent}${cssVar(t.path)}: ${cssValue(t, palette)};`);
  return [
    "/* Generated by `bun run tokens` from packages/ui/tokens/*.tokens.json",
    "   (ADR 0019). Don't edit: change the tokens and run it again. */",
    ":root {",
    "  color-scheme: light dark;",
    ...decl(flatten(s.base), "  "),
    ...decl(flatten(s.light), "  "),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    "  :root {",
    ...decl(flatten(s.dark), "    "),
    "  }",
    "}",
    "",
    // After the system's dark, so a forced light wins over it.
    '[data-theme="light"] {',
    "  color-scheme: light;",
    ...decl(flatten(s.light), "  "),
    "}",
    "",
    '[data-theme="dark"] {',
    "  color-scheme: dark;",
    ...decl(flatten(s.dark), "  "),
    "}",
    "",
  ].join("\n");
}

/** DESIGN.md's token tables, by group: color, then text, radius, space and icon. */
export function renderTables(s: TokenSources): Record<string, string> {
  const palette = paletteOf(s);
  const tables: Record<string, string> = {};
  const dark = new Map(flatten(s.dark).map((t) => [t.path, t]));
  const colours = flatten(s.light);
  if (colours.length > 0)
    tables.color = [
      "| Use | Variable | Light | Dark |",
      "|---|---|---|---|",
      ...colours.map((t) => {
        const d = dark.get(t.path);
        return `| ${t.description ?? ""} | \`var(${cssVar(t.path)})\` | ${cssValue(t, palette)} | ${d ? cssValue(d, palette) : ""} |`;
      }),
    ].join("\n");
  for (const group of TABLE_GROUPS) {
    const ts = flatten(s.base).filter((t) => t.path.startsWith(`${group}.`));
    if (ts.length === 0) continue;
    tables[group] = [
      "| Variable | Value | Used for |",
      "|---|---|---|",
      ...ts.map(
        (t) =>
          `| \`var(${cssVar(t.path)})\` | ${cssValue(t, palette)} | ${t.description ?? ""} |`,
      ),
    ].join("\n");
  }
  return tables;
}

/** Puts each table between its `<!-- tokens:<group> -->` markers. */
export function replaceTables(
  md: string,
  tables: Record<string, string>,
): string {
  let out = md;
  for (const [group, table] of Object.entries(tables)) {
    const re = new RegExp(
      `<!-- tokens:${group} -->[\\s\\S]*?<!-- /tokens:${group} -->`,
    );
    if (!re.test(out))
      throw new Error(
        `DESIGN.md has lost its <!-- tokens:${group} --> and <!-- /tokens:${group} --> markers. Put them back where that table goes.`,
      );
    out = out.replace(
      re,
      () => `<!-- tokens:${group} -->\n\n${table}\n\n<!-- /tokens:${group} -->`,
    );
  }
  return out;
}
