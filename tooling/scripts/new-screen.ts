import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  FEATURES,
  planScreen,
  SCREEN_TEMPLATES,
  screenName,
} from "./new-lib.js";

// `bun run new screen <feature>`: a feature folder in the web app, with the
// screen, its hook, and their first tests, red until it's built (ADR 0022).
// Called by new.ts.

const TEMPLATES = join(import.meta.dir, "../templates/screen");

/** Writes a new screen's files, or exits saying why it can't. */
export function makeScreen(feature: string): void {
  const plan = planScreen(feature, {
    features: existsSync(FEATURES) ? readdirSync(FEATURES) : [],
    templates: Object.fromEntries(
      SCREEN_TEMPLATES.map((t) => [
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
  execFileSync("bunx", ["prettier", "--write", "--log-level=warn", ...paths], {
    stdio: "inherit",
  });

  const name = screenName(feature);
  console.info(`Made ${name}Screen:
${paths.map((p) => `  ${p}`).join("\n")}

Next (ADR 0002, 0022, 0023):
  1. Write the screen's spec, and get it approved.
  2. Replace the two generated tests with tests from the spec: the hook's
     (what it gives the screen, what re-renders) and the e2e's (one per
     criterion). Commit them alone: they fail.
  3. Build the hook and the screen until they pass, from @cookto/ui parts,
     then put the screen in the app.`);
}
