import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { generated, readSources } from "./tokens.js";
import {
  COMPONENT_TEMPLATES,
  DESIGN,
  INDEX,
  KINDS,
  planComponent,
} from "./new-lib.js";
import { makeScreen } from "./new-screen.js";

// `bun run new component <Name>` or `bun run new layout <Name>`: a new part
// of the design system, with every file the checks ask for (ADR 0019).
// `bun run new screen <feature>`: a new screen (new-screen.ts, ADR 0022).
// Never make the folder by hand.

const USAGE =
  "Usage: bun run new component <Name>    (for example: Button)\n" +
  "       bun run new layout <Name>       (for example: Grid)\n" +
  "       bun run new screen <feature>    (for example: week-plan)";
const [kind, name] = process.argv.slice(2);
if (kind === "screen" && name) {
  makeScreen(name);
  process.exit(0);
}
if ((kind !== "component" && kind !== "layout") || !name) {
  console.error(USAGE);
  process.exit(1);
}

// Components and layouts share one namespace: both are imported from @cookto/ui.
const existing = Object.values(KINDS).flatMap(({ folder }) => {
  const dir = `packages/ui/src/${folder}`;
  return existsSync(dir) ? readdirSync(dir) : [];
});
const TEMPLATES = join(import.meta.dir, "../templates/component");
const plan = planComponent(
  name,
  {
    components: existing,
    index: readFileSync(INDEX, "utf8"),
    design: readFileSync(DESIGN, "utf8"),
    templates: Object.fromEntries(
      COMPONENT_TEMPLATES.map((t) => [
        t,
        readFileSync(join(TEMPLATES, t), "utf8"),
      ]),
    ),
  },
  kind,
);
if ("problem" in plan) {
  console.error(plan.problem);
  process.exit(1);
}

for (const { path, content } of plan.files) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
const paths = plan.files.map((f) => f.path);
execFileSync(
  "bunx",
  [
    "prettier",
    "--write",
    "--log-level=warn",
    ...paths.filter((p) => p !== DESIGN),
  ],
  { stdio: "inherit" },
);
// DESIGN.md is formatted the way `bun run tokens` writes it, which
// design:check compares it with.
for (const file of await generated(readSources()))
  writeFileSync(file.path, file.content);

console.info(`Made ${name}:
${paths.map((p) => `  ${p}`).join("\n")}

Next (ADR 0002, 0019):
  1. Get its design from a code owner, and fill in its row in DESIGN.md.
  2. Replace packages/ui/test/${name}.test.tsx with tests of what it does. Commit them alone: they fail.
  3. Build ${name} until they pass, and add its states to ${name}.kit.tsx.`);
