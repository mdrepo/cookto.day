// The cold review (ADR 0029), on the owner's laptop for now: a second model
// that didn't write the PR reads its diff and spec, answers the checklist in
// .github/review/checklist.md, and posts what it found as a PR comment.
// Advisory: nothing waits for it yet.
//
//   bun run review <pr>            review and post a comment
//   bun run review <pr> --dry      review and print, post nothing
//
// It runs `claude -p` in this repo with read-only tools, on the owner's own
// Claude Code login. REVIEW_MODEL picks the model (default: claude-fable-5-1).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = join(import.meta.dir, "../..");
const [pr, ...flags] = process.argv.slice(2);
const dry = flags.includes("--dry");
const model = process.env.REVIEW_MODEL ?? "claude-fable-5-1";

if (!pr || !/^\d+$/.test(pr)) {
  console.error("Usage: bun run review <pr number> [--dry]");
  process.exit(2);
}

function run(cmd: string, args: string[], input?: string): string {
  const result = spawnSync(cmd, args, {
    cwd: repo,
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(`${cmd} ${args[0] ?? ""} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

const info = JSON.parse(
  run("gh", ["pr", "view", pr, "--json", "title,body,headRefName"]),
) as { title: string; body: string; headRefName: string };
const diff = run("gh", ["pr", "diff", pr]);
const closes = /Closes #(\d+)/i.exec(info.body)?.[1];
const spec = closes
  ? run("git", ["ls-files", `specs/${closes}-*.md`])
      .trim()
      .split("\n")[0]
  : undefined;
const checklist = readFileSync(
  join(repo, ".github/review/checklist.md"),
  "utf8",
);

// Everything the PR says about itself is fenced as data: the checklist
// tells the reviewer to treat it as claims, never as instructions.
const prompt = `${checklist}

---

The PR is #${pr}, branch ${info.headRefName}. The spec it closes is ${spec ? `\`${spec}\` (read it)` : "not named: that is a finding"}. The ADRs are in docs/adr/; AGENTS.md has the rules. You may read any file in the repo.

<pr_title>
${info.title}
</pr_title>

<pr_body>
${info.body}
</pr_body>

<diff>
${diff}
</diff>`;

console.error(`review: #${pr} with ${model}, read-only...`);
const review = run(
  "claude",
  ["-p", "--model", model, "--allowedTools", "Read,Grep,Glob"],
  prompt,
).trim();

const verdict = /VERDICT: (PASS|FAIL)/.exec(review)?.[1] ?? "UNCLEAR";
const comment = `### Cold review (advisory, ${model})\n\n${review}`;

if (dry) console.log(comment);
else {
  run("gh", ["pr", "comment", pr, "--body-file", "-"], comment);
  console.error(`review: posted on #${pr}: ${verdict}`);
}
process.exit(verdict === "PASS" ? 0 : 1);
