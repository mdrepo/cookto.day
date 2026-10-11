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
  planComponent,
} from "./new-lib.js";

// `bun run new component <Name>`: a new part of the design system, with every
// file the checks ask for (ADR 0019). Never make the folder by hand.
// Layouts and screens come with layouts.

const USAGE = "Usage: bun run new component <Name>   (for example: Button)";
const [kind, name] = process.argv.slice(2);
if (kind !== "component" || !name) {
  console.error(USAGE);
  process.exit(1);
}

const COMPONENTS = "packages/ui/src/components";
const TEMPLATES = join(import.meta.dir, "../templates/component");
const plan = planComponent(name, {
  components: existsSync(COMPONENTS) ? readdirSync(COMPONENTS) : [],
  index: readFileSync(INDEX, "utf8"),
  design: readFileSync(DESIGN, "utf8"),
  templates: Object.fromEntries(
    COMPONENT_TEMPLATES.map((t) => [
      t,
      readFileSync(join(TEMPLATES, t), "utf8"),
    ]),
  ),
});
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
