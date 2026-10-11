import { readdirSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { Glob } from "bun";
import {
  componentProblems,
  designProblems,
  tokenDefinitions,
} from "./check-design-lib.js";
import { tokenProblems } from "./tokens-lib.js";
import { generated, readSources } from "./tokens.js";

// DESIGN.md (ADR 0011): finds colours, type, corners, spacing and physical
// left/right in the apps' and packages' src/ that the guide doesn't allow, so an agent can't quietly
// invent a look or break the Arabic layout. And the tokens themselves
// (ADR 0019): readable in both themes, defined in one place, and the
// generated files up to date.

// The ratchet. When the guide tightens and a file is over, its count of
// off-guide values is recorded here: it may go down, never up. Lower a cap
// whenever you remove some, and delete the entry at 0. Never add or raise
// one: ask a code owner. Empty, because the app started on the guide.
const EXISTING: Record<string, number> = {};

const failures: string[] = [];
const files = [
  ...new Glob("{apps,packages}/*/src/**/*.{css,html,ts,tsx}").scanSync(),
];
// If files move and the pattern stops matching, fail rather than pass on
// nothing.
if (files.length === 0) {
  console.error(
    "design:check found no files in apps/*/src or packages/*/src. Did they move? Update the pattern in tooling/scripts/check-design.ts.",
  );
  process.exit(1);
}
/** The one file that may define CSS variables: `bun run tokens` writes it. */
const GENERATED_TOKENS = "packages/ui/src/tokens.css";

const sources = readSources();
const badTokens = tokenProblems(sources);
if (badTokens.length > 0) {
  failures.push(
    `packages/ui/tokens/: ${badTokens.length} problem(s):\n` +
      badTokens.map((p) => `    ${p}`).join("\n"),
  );
} else {
  for (const { path, content } of await generated(sources)) {
    if (readFileSync(path, "utf8") !== content)
      failures.push(
        `${relative(process.cwd(), path)} is out of date with packages/ui/tokens/. Run: bun run tokens`,
      );
  }
}

// Every component has the same files, made the same way (ADR 0019).
const COMPONENTS = "packages/ui/src/components";
const folders = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({
    name: d.name,
    files: readdirSync(`${COMPONENTS}/${d.name}`),
  }));
const missing = componentProblems(
  folders,
  readdirSync("packages/ui/test"),
  readFileSync("DESIGN.md", "utf8"),
);
if (missing.length > 0)
  failures.push(
    `${COMPONENTS}: ${missing.length} missing part(s):\n` +
      missing.map((p) => `    ${p}`).join("\n"),
  );

for (const file of files) {
  if (file !== GENERATED_TOKENS) {
    const defined = tokenDefinitions(readFileSync(file, "utf8"));
    if (defined.length > 0)
      failures.push(
        `${file}:\n` +
          defined.map((p) => `    line ${p.line}: ${p.text}`).join("\n"),
      );
  }
  const found = designProblems(readFileSync(file, "utf8"));
  const cap = EXISTING[file] ?? 0;
  if (found.length > cap) {
    failures.push(
      `${file}: ${found.length} value(s) not in DESIGN.md` +
        (cap
          ? ` (it had ${cap} when the rule arrived; that may only go down)`
          : "") +
        `:\n` +
        found.map((p) => `    line ${p.line}: ${p.text}`).join("\n"),
    );
  } else if (found.length < cap) {
    console.log(
      `design:check: ${file} is down to ${found.length}; lower its cap.`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `Design check failed: use the tokens and components in DESIGN.md.\n` +
      `If nothing there fits, stop and ask a code owner for the design. Don't invent one.\n\n` +
      failures.join("\n\n"),
  );
  process.exit(1);
}
console.log(
  `Design: the tokens are readable and up to date, and colours, type, corners, spacing and directions in ${files.length} files match DESIGN.md.`,
);
