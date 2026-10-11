import { readFileSync } from "node:fs";
import { Glob } from "bun";

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

// Workspaces (ADR 0016) may only depend on each other. Every outside package
// is declared once, at the root, where the allowlist and the health check see
// it, and one lockfile pins it.
const workspaces =
  (
    JSON.parse(readFileSync("package.json", "utf8")) as {
      workspaces?: string[];
    }
  ).workspaces ?? [];
for (const pattern of workspaces) {
  for (const manifest of new Glob(`${pattern}/package.json`).scanSync()) {
    const ws = JSON.parse(readFileSync(manifest, "utf8")) as Partial<
      Record<
        Section | "peerDependencies" | "optionalDependencies",
        Record<string, string>
      >
    >;
    for (const section of [
      ...sections,
      "peerDependencies",
      "optionalDependencies",
    ] as const) {
      for (const [name, version] of Object.entries(ws[section] ?? {})) {
        if (!version.startsWith("workspace:"))
          problems.push(
            `${manifest}: ${section} has ${name}@${version}. Declare outside packages in the root package.json (ADR 0016); workspaces depend on each other with "workspace:*"`,
          );
      }
    }
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
