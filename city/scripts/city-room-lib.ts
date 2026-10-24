import type { Repo } from "./city-graph-lib.js";

// What the town hall's room and the workshop hold (#252), read from the
// repo when the city is built. Specs: one per issue in specs/, built once a
// feat or fix commit names its issue. Skills: each .agents/skills/*/SKILL.md
// with its steps, its "## " headings in order. Stamps: each generator of
// `bun run new`, and the files it makes (as tooling/scripts/new-lib.ts
// lays them out). Pure; unit tests in test/city-room.test.ts.

export interface Spec {
  n: number;
  file: string;
  title: string;
  /** "built": a feat or fix commit names it; else approved, on main. */
  state: "built" | "approved";
}

export interface Skill {
  name: string;
  file: string;
  /** What it's for, from its description, first sentence. */
  what: string;
  steps: string[];
}

export interface Stamp {
  command: string;
  what: string;
  makes: string[];
  edits: string[];
}

/** The specs on main, newest issue first. */
export function specs(repo: Repo): Spec[] {
  const built = new Set<number>();
  for (const c of repo.history.commits)
    if (/^(feat|fix)\b/.test(c.m))
      for (const m of c.m.matchAll(/#(\d+)/g)) built.add(Number(m[1]));
  return repo.files
    .flatMap((file) => {
      const m = /^specs\/(\d+)-[^/]+\.md$/.exec(file);
      if (!m) return [];
      const n = Number(m[1]);
      const head = /^#\s+(.+)$/m.exec(repo.read(file))?.[1] ?? file;
      const title = head.replace(/^#?\d+:\s*/, "").trim();
      const state: Spec["state"] = built.has(n) ? "built" : "approved";
      return [{ n, file, title, state }];
    })
    .sort((a, b) => b.n - a.n);
}

/** The first sentence of a description, without its trigger lists. */
const firstSentence = (text: string) =>
  (/^(.+?[.:])(\s|$)/.exec(text.replace(/\s*\([^)]*\)/g, ""))?.[1] ?? text)
    .replace(/:$/, ".")
    .trim();

/** The skills agents follow, each with its steps in order. */
export function skills(repo: Repo): Skill[] {
  return repo.files
    .flatMap((file) => {
      // The files live in .agents/skills; .claude/skills links to them.
      const m = /^\.agents\/skills\/([^/]+)\/SKILL\.md$/.exec(file);
      if (!m) return [];
      const text = repo.read(file);
      const description = /^description:\s*(.+)$/m.exec(text)?.[1] ?? "";
      const steps = [...text.matchAll(/^##\s+(.+)$/gm)].map((h) =>
        (h[1] ?? "").replace(/^(Phase\s+)?\d+[.:]\s*/, "").trim(),
      );
      return [
        { name: m[1] ?? file, file, what: firstSentence(description), steps },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The generators of `bun run new`, and what each one stamps out. */
export function stamps(repo: Repo): Stamp[] {
  const has = (dir: string) => repo.files.some((f) => f.startsWith(dir));
  const part = (kind: "component" | "layout", folder: string): Stamp => ({
    command: `bun run new ${kind} <Name>`,
    what: `A new ${kind === "component" ? "part" : "layout"} of the design kit, with every file the checks ask for.`,
    makes: [
      `packages/ui/src/${folder}/<Name>/<Name>.tsx`,
      `packages/ui/src/${folder}/<Name>/<Name>.module.css`,
      `packages/ui/src/${folder}/<Name>/<Name>.kit.tsx`,
      "packages/ui/test/<Name>.test.tsx",
    ],
    edits: ["packages/ui/src/index.ts", "DESIGN.md"],
  });
  const out: Stamp[] = [];
  if (has("tooling/templates/component/"))
    out.push(part("component", "components"), part("layout", "layouts"));
  if (has("tooling/templates/screen/"))
    out.push({
      command: "bun run new screen <feature>",
      what: "A new screen and its hook, with their first tests, red until it's built.",
      makes: [
        "apps/web/src/features/<feature>/<Name>Screen.tsx",
        "apps/web/src/features/<feature>/use<Name>Screen.ts",
        "apps/web/test/features/<feature>/use<Name>Screen.test.ts",
        "apps/web/e2e/<feature>.spec.ts",
      ],
      edits: [],
    });
  return out;
}
