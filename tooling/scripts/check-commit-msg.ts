import { readFileSync } from "node:fs";
import { checkCommitSubjects } from "./commit-rules.js";

// Run by the commit-msg git hook with the path of the message file.

const file = process.argv[2];
if (!file) throw new Error("usage: check-commit-msg <message-file>");
const subject =
  readFileSync(file, "utf8")
    .split("\n")
    .find((line) => line.trim() && !line.startsWith("#")) ?? "";

const problems = checkCommitSubjects([subject]);
if (problems.length > 0) {
  console.error(`${problems.join("\n")}

Examples:
  feat(pantry): show how many days each item has left
  test: spinach bought 4 days ago is suggested first

In the TDD workflow (ADR 0002), the commit that adds failing tests must be "test: ...".`);
  process.exit(1);
}
