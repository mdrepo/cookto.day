import { readFileSync } from "node:fs";

// Fails when package.json and dependency-allowlist.json disagree (ADR 0006).

type Section = "dependencies" | "devDependencies";
const sections: Section[] = ["dependencies", "devDependencies"];

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Partial<
  Record<Section, Record<string, string>>
>;
const allowlist = JSON.parse(
  readFileSync("dependency-allowlist.json", "utf8"),
) as Partial<Record<Section, Record<string, { reason?: string }>>>;

const problems: string[] = [];
for (const section of sections) {
  const installed = Object.keys(pkg[section] ?? {});
  const allowed = allowlist[section] ?? {};
  for (const name of installed) {
    if (!(name in allowed))
      problems.push(
        `${section}: ${name} is in package.json but not in dependency-allowlist.json`,
      );
    else if (!allowed[name]?.reason)
      problems.push(
        `${section}: ${name} has no "reason" in dependency-allowlist.json`,
      );
  }
  for (const name of Object.keys(allowed)) {
    if (!installed.includes(name))
      problems.push(
        `${section}: ${name} is in dependency-allowlist.json but not in package.json`,
      );
  }
}

if (problems.length > 0) {
  console.error(`Dependencies don't match the allowlist (ADR 0006):
${problems.map((p) => `  ${p}`).join("\n")}

Do not add a package to make this pass. First check whether the platform
(Bun, Web APIs, the browser) already does the job (ADR 0005). If a new
package really is needed, add it to dependency-allowlist.json with a reason,
and say why in the PR: an owner must approve it. If you removed a package,
remove its entry.`);
  process.exit(1);
}
console.log("Dependencies match the allowlist.");
