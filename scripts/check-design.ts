import { readFileSync } from "node:fs";
import { Glob } from "bun";
import { designProblems } from "./check-design-lib.js";

// DESIGN.md (ADR 0011): finds colours, type, corners, spacing and physical
// left/right in src/ that the guide doesn't allow, so an agent can't quietly
// invent a look or break the Arabic layout.

// The ratchet. When the guide tightens and a file is over, its count of
// off-guide values is recorded here: it may go down, never up. Lower a cap
// whenever you remove some, and delete the entry at 0. Never add or raise
// one: ask a code owner. Empty, because the app started on the guide.
const EXISTING: Record<string, number> = {};

const failures: string[] = [];
for (const file of new Glob("src/**/*.{css,html,ts}").scanSync()) {
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
  "Design: colours, type, corners, spacing and directions match DESIGN.md.",
);
