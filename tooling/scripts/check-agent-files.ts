import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { Glob } from "bun";
import { askRules, isOwned, ownedPaths } from "./codeowners.js";
import { COMMIT_TYPES } from "./commit-rules.js";

// ADR 0010: AGENTS.md and the skills in .agents/skills/ are the single source
// of agent guidance. Antigravity and Codex read .agents/skills/; Claude Code
// reads .claude/skills/, where each skill is a symlink to the same folder.
// This keeps them in step and catches links to files that no longer exist.

const SKILLS = ".agents/skills";
const CLAUDE_SKILLS = ".claude/skills";
const problems: string[] = [];

const skills = readdirSync(SKILLS).filter((n) =>
  lstatSync(join(SKILLS, n)).isDirectory(),
);

for (const name of skills) {
  const file = join(SKILLS, name, "SKILL.md");
  if (!existsSync(file)) {
    problems.push(`${join(SKILLS, name)} has no SKILL.md`);
    continue;
  }
  const front =
    /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, "utf8"))?.[1] ?? "";
  if (!new RegExp(`^name: ${name}$`, "m").test(front))
    problems.push(`${file}: frontmatter "name" must be "${name}"`);
  if (!/^description: .{40,}/m.test(front))
    problems.push(
      `${file}: needs a "description" saying what it does and when to use it`,
    );

  const link = join(CLAUDE_SKILLS, name);
  const target = `../../${SKILLS}/${name}`;
  if (
    !existsSync(link) ||
    !lstatSync(link).isSymbolicLink() ||
    readlinkSync(link).replace(/\\/g, "/") !== target
  ) {
    problems.push(
      `${link} must be a symlink to ${target}  (ln -sfn ${target} ${link})`,
    );
  }
}

if (existsSync(CLAUDE_SKILLS)) {
  for (const name of readdirSync(CLAUDE_SKILLS)) {
    if (!skills.includes(name))
      problems.push(
        `${join(CLAUDE_SKILLS, name)} has no matching skill in ${SKILLS}: put skills there, not here`,
      );
  }
}

if (readFileSync("CLAUDE.md", "utf8").trim() !== "@AGENTS.md") {
  problems.push(
    `CLAUDE.md must contain only "@AGENTS.md": rules go in AGENTS.md (ADR 0010)`,
  );
}

// Claude Code asks before editing exactly the paths CODEOWNERS protects, and
// before merging a PR: merging is the owner's approval (ADR 0017).
const settings = JSON.parse(readFileSync(".claude/settings.json", "utf8")) as {
  permissions?: { ask?: string[] };
};
const expectedAsk = [
  ...askRules(ownedPaths(readFileSync(".github/CODEOWNERS", "utf8"))),
  "Bash(gh pr merge:*)",
  "Bash(gh pr merge)",
];
const actualAsk = settings.permissions?.ask ?? [];
const missingAsk = expectedAsk.filter((r) => !actualAsk.includes(r));
const extraAsk = actualAsk.filter((r) => !expectedAsk.includes(r));
if (missingAsk.length > 0 || extraAsk.length > 0) {
  problems.push(
    `.claude/settings.json permissions.ask must match .github/CODEOWNERS, plus asking before gh pr merge. Missing: ${missingAsk.join(", ") || "none"}. Extra: ${extraAsk.join(", ") || "none"}.`,
  );
}

// Protection follows the files (ADR 0016): in every workspace, the manifest,
// configs, build scripts and tests are code-owned, so a new or moved
// workspace can't leave its tests editable without an owner.
const owned = ownedPaths(readFileSync(".github/CODEOWNERS", "utf8"));
const GUARDED = [
  "package.json",
  "tsconfig.json",
  "bunfig.toml",
  "wrangler.jsonc",
  "wrangler.toml",
  "scripts/",
  "test/",
  "e2e/",
];
const workspaces =
  (
    JSON.parse(readFileSync("package.json", "utf8")) as {
      workspaces?: string[];
    }
  ).workspaces ?? [];
for (const pattern of workspaces) {
  for (const manifest of new Glob(`${pattern}/package.json`).scanSync()) {
    const dir = dirname(manifest);
    const configs = readdirSync(dir).filter((n) =>
      /\.config\.[cm]?[jt]s$/.test(n),
    );
    for (const name of [...GUARDED, ...configs]) {
      const path = `${dir}/${name}`;
      if (!existsSync(path.replace(/\/$/, ""))) continue;
      if (!isOwned(path, owned))
        problems.push(
          `${path} isn't in .github/CODEOWNERS. Add "/${path}  @mdrepo" there (ADR 0016), then the matching ask rule in .claude/settings.json`,
        );
    }
  }
}

// AGENTS.md lists the same commit types the hooks and CI accept.
const typesLine =
  /type one of `([a-z ]+)`/.exec(readFileSync("AGENTS.md", "utf8"))?.[1] ?? "";
if (
  typesLine.split(" ").sort().join(" ") !== [...COMMIT_TYPES].sort().join(" ")
) {
  problems.push(
    `AGENTS.md must list the commit types from tooling/scripts/commit-rules.ts: ${COMMIT_TYPES.join(" ")}`,
  );
}

// Relative markdown links must point at files that exist.
for (const file of [
  "AGENTS.md",
  ...skills.map((n) => join(SKILLS, n, "SKILL.md")),
]) {
  if (!existsSync(file)) continue;
  for (const m of readFileSync(file, "utf8").matchAll(
    /\]\(([^)#\s]+)(?:#[^)]*)?\)/g,
  )) {
    const href = m[1] ?? "";
    if (/^[a-z]+:/i.test(href)) continue;
    if (!existsSync(join(dirname(file), href)))
      problems.push(`${file}: link to ${href}, which doesn't exist`);
  }
}

if (problems.length > 0) {
  console.error(
    `Agent guidance files are out of step (ADR 0010):\n${problems.map((p) => `  ${p}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`Agent guidance: AGENTS.md and ${skills.length} skill(s) in step.`);
