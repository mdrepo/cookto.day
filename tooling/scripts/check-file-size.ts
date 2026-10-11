import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { limitFor, lineCount, sizeProblems } from "./file-size-lib.js";

// Every file in the repo stays small: a component under 150 lines, any other
// file under 300 (file-size-lib.ts). Reads what git tracks, so build output
// and dependencies don't count.

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    encoding: "utf8",
  },
)
  .split("\n")
  .filter((path) => path && limitFor(path) !== null)
  .flatMap((path) => {
    try {
      return [{ path, lines: lineCount(readFileSync(path, "utf8")) }];
    } catch {
      return []; // deleted but not yet committed
    }
  });

const problems = sizeProblems(files);
if (problems.length > 0) {
  console.error(
    `File size check failed:\n${problems.map((p) => `  ${p}`).join("\n")}\n` +
      `If a file truly can't be split, stop and ask a code owner.`,
  );
  process.exit(1);
}
console.log(
  `Sizes: ${files.length} files, components under 150 lines and the rest under 300.`,
);
