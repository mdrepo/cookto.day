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

// The variables are defined in these blocks (the system's theme, or one
// forced with data-theme), so they may use raw values.
const TOKEN_BLOCKS = /(?::root|\[data-theme="[a-z]+"\])\s*\{[^}]*\}/g;

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
  if (
    /@font-face|@import\s+(?:url\(\s*)?["']?(?:[a-z]+:)?\/\/|url\(\s*["']?(https?:)?\/\//i.test(
      line,
    )
  )
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

/**
 * CSS variables defined in a source file. They may only be defined in the
 * generated packages/ui/src/tokens.css, so every value has one source
 * (ADR 0019).
 */
export function tokenDefinitions(source: string): DesignProblem[] {
  return source.split("\n").flatMap((line, i) =>
    /(?:^|[\s;{])--[a-z][\w-]*\s*:/i.test(line)
      ? [
          {
            line: i + 1,
            text: "defines a CSS variable: add it to packages/ui/tokens/*.tokens.json and run bun run tokens",
          },
        ]
      : [],
  );
}

/** A folder in packages/ui/src/components, and the files in it. */
export interface ComponentFolder {
  name: string;
  files: string[];
}

/**
 * What each component is missing (ADR 0019): its code, styles and kit
 * examples beside it, its test in packages/ui/test/, and its row in
 * DESIGN.md. `tests` are the file names in packages/ui/test/.
 */
export function componentProblems(
  folders: ComponentFolder[],
  tests: string[],
  designMd: string,
  base = "packages/ui/src/components",
): string[] {
  return folders.flatMap(({ name, files }) => {
    const dir = `${base}/${name}`;
    const missing = [".tsx", ".module.css", ".kit.tsx"]
      .map((ext) => `${name}${ext}`)
      .filter((f) => !files.includes(f))
      .map((f) => `${dir}/${f}`);
    if (!tests.includes(`${name}.test.tsx`))
      missing.push(`packages/ui/test/${name}.test.tsx`);
    const out = missing.map((f) => `${name}: add ${f}`);
    if (!designMd.includes(`\`${name}\``))
      out.push(`${name}: add a row for \`${name}\` to DESIGN.md`);
    return out;
  });
}

/** The one file that may import Lucide (ADR 0020). */
const ICON_FILE = "packages/ui/src/components/Icon/Icon.tsx";

/**
 * Icons come from the Icon component (ADR 0020): only it imports Lucide, and
 * apps draw no SVG of their own.
 */
export function iconProblems(path: string, source: string): string[] {
  const out: string[] = [];
  if (path !== ICON_FILE && /from\s+["']lucide-react["']/.test(source))
    out.push(
      `imports lucide-react: use <Icon name="..." /> from @cookto/ui instead`,
    );
  if (/^apps\/[^/]+\/src\//.test(path) && /<svg[\s>]/.test(source))
    out.push(`draws its own <svg>: use <Icon name="..." /> from @cookto/ui`);
  return out;
}

/** The one app with CSS of its own: the kit page frames the parts. */
const APP_CSS_ALLOWED = /^apps\/kit\/src\//;

/**
 * Apps compose parts and layouts from @cookto/ui; they don't style
 * (ADR 0019). `paths` are files in apps' and packages' src/.
 */
export function appCssProblems(paths: string[]): string[] {
  return paths
    .filter(
      (p) => /^apps\/[^/]+\/src\/.+\.css$/.test(p) && !APP_CSS_ALLOWED.test(p),
    )
    .map(
      (p) =>
        `${p}: apps don't style. Build the screen from parts and layouts in @cookto/ui, and add or change one there if something's missing (ask a code owner for its design).`,
    );
}
