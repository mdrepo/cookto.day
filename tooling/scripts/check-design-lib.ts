// Pure parts of the design check (scripts/check-design.ts), with unit tests.
// DESIGN.md: colours, type sizes, radii and fonts come from the CSS variables;
// spacing is in steps of 4px; layout uses logical properties so Arabic can
// flip to right to left; nothing loads from another site (ADR 0011).

const FONT_WEIGHTS = ["400", "600", "700", "inherit"];

const COLOUR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(|\b(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta)\b/;
const COLOUR_PROPS =
  "color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|accent-color|caret-color";
const SPACING_PROPS =
  "margin(?:-[a-z]+)*|padding(?:-[a-z]+)*|gap|row-gap|column-gap|inset(?:-[a-z]+)*";

// Physical directions break right-to-left layouts. Each has a logical twin.
const PHYSICAL: [RegExp, string][] = [
  [/\b(margin|padding|border)-(left|right)\b/, "the -inline-start / -end form"],
  [/(?:^|[\s;{])(left|right)\s*:/, "inset-inline-start / -end"],
  [/\btext-align\s*:\s*(left|right)\b/, "text-align: start / end"],
  [/\bfloat\s*:\s*(left|right)\b/, "float: inline-start / inline-end"],
  [
    /\bborder-(top|bottom)-(left|right)-radius\b/,
    "border-start-start-radius and friends",
  ],
  [
    /\.style\.(margin|padding)(Left|Right)\b|\.style\.(left|right)\b/,
    "the logical style property",
  ],
];

// The variables are defined in these blocks, so they may use raw values.
const TOKEN_BLOCKS = /:root\s*\{[^}]*\}/g;

export interface DesignProblem {
  line: number;
  text: string;
}

const usesVar = (v: string, prefix: string) =>
  new RegExp(`^var\\(--${prefix}[a-z0-9-]*\\)$`).test(v);

function colourProblems(line: string): string[] {
  const values = [
    ...line.matchAll(
      new RegExp(`(?:^|[\\s;{"'])(?:${COLOUR_PROPS})\\s*:\\s*([^;}\\n]*)`, "g"),
    ),
    ...line.matchAll(
      /\.style\.(?:color|background\w*|border\w*|outline\w*|fill|stroke|boxShadow)\s*=\s*([^;\n]*)/g,
    ),
  ];
  return values.flatMap((m) => {
    const literal = COLOUR_LITERAL.exec(m[1] ?? "");
    return literal ? [`colour "${literal[0]}": use a --color-* variable`] : [];
  });
}

function typeProblems(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(/font-size\s*:\s*([^;}\n"']+)/g)) {
    const v = (m[1] ?? "").trim();
    if (v !== "inherit" && !usesVar(v, "text-"))
      out.push(`font size "${v}": use a --text-* variable`);
  }
  for (const m of line.matchAll(/font-weight\s*:\s*([^;}\n"']+)/g)) {
    const v = (m[1] ?? "").trim();
    if (!FONT_WEIGHTS.includes(v))
      out.push(`font weight "${v}": use 400, 600 or 700`);
  }
  for (const m of line.matchAll(/font-family\s*:\s*([^;}\n"]+)/g)) {
    const v = (m[1] ?? "").trim();
    if (v !== "inherit" && !usesVar(v, "font-"))
      out.push("font family: use var(--font-body), system fonts only");
  }
  return out;
}

function shapeProblems(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(
    /border(?:-[a-z]+)*-radius\s*:\s*([^;}\n"']+)/g,
  )) {
    const v = (m[1] ?? "").trim();
    if (v.split(/\s+/).some((p) => p !== "0" && !usesVar(p, "radius-")))
      out.push(`corner radius "${v}": use a --radius-* variable`);
  }
  for (const m of line.matchAll(
    new RegExp(`(?:^|[\\s;{])(?:${SPACING_PROPS})\\s*:\\s*([^;}\\n"']+)`, "g"),
  )) {
    for (const px of (m[1] ?? "").matchAll(/(-?[0-9.]+)px\b/g)) {
      if (Number(px[1]) % 4 !== 0)
        out.push(`spacing "${px[0]}": use steps of 4px (--space-*)`);
    }
  }
  return out;
}

function directionAndOriginProblems(line: string): string[] {
  const out: string[] = [];
  for (const [re, instead] of PHYSICAL) {
    const m = re.exec(line);
    if (m)
      out.push(`"${m[0].trim()}" breaks right-to-left layouts: use ${instead}`);
  }
  if (/@font-face|@import\b|url\(\s*["']?(https?:)?\/\//.test(line))
    out.push(
      "loads something from another site: everything ships with the app",
    );
  return out;
}

/** Values in one source file (CSS, HTML or TypeScript) that DESIGN.md doesn't allow. */
export function designProblems(source: string): DesignProblem[] {
  const text = source.replace(TOKEN_BLOCKS, (b) => b.replace(/[^\n]/g, " "));
  return text
    .split("\n")
    .flatMap((line, i) =>
      [
        ...colourProblems(line),
        ...typeProblems(line),
        ...shapeProblems(line),
        ...directionAndOriginProblems(line),
      ].map((t) => ({ line: i + 1, text: t })),
    );
}
