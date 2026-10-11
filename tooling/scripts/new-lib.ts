// Pure parts of the generator (scripts/new.ts), with unit tests through it.
// ADR 0019: a new part starts from templates in tooling/templates/, so it
// has every file the checks ask for from its first commit.

/** Where each component template goes, for a component called `name`. */
const COMPONENT_FILES: Record<string, (name: string) => string> = {
  "Name.tsx.tmpl": (n) => `packages/ui/src/components/${n}/${n}.tsx`,
  "Name.module.css.tmpl": (n) =>
    `packages/ui/src/components/${n}/${n}.module.css`,
  "Name.kit.tsx.tmpl": (n) => `packages/ui/src/components/${n}/${n}.kit.tsx`,
  "Name.test.tsx.tmpl": (n) => `packages/ui/test/${n}.test.tsx`,
};

export const COMPONENT_TEMPLATES = Object.keys(COMPONENT_FILES);
export const INDEX = "packages/ui/src/index.ts";
export const DESIGN = "DESIGN.md";

export interface Repo {
  /** Names of the components that exist. */
  components: string[];
  /** packages/ui/src/index.ts */
  index: string;
  /** DESIGN.md */
  design: string;
  /** Template file name to its text. */
  templates: Record<string, string>;
}

export interface FileToWrite {
  path: string;
  content: string;
}

/** Why `name` can't be a new component, or null when it can. */
export function nameProblem(name: string, components: string[]): string | null {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name))
    return `"${name}" isn't a component name: a component's name starts with a capital letter and has only letters and digits, like Button or DishCard.`;
  if (components.includes(name))
    return `${name} already exists, in packages/ui/src/components/${name}/. Reuse it, or pick another name.`;
  return null;
}

/** index.ts with the component's export, in name order among the others. */
export function withExport(index: string, name: string): string {
  const line = `export { ${name} } from "./components/${name}/${name}.js";\n`;
  const exports = [
    ...index.matchAll(/^export \{[^}]*\} from "\.\/components\/(\w+)\//gm),
  ];
  const after = exports.find((m) => (m[1] ?? "") > name);
  const at =
    after?.index ??
    (exports.length > 0
      ? index.indexOf("\n", index.indexOf(exports.at(-1)?.[0] ?? "")) + 1
      : index.length);
  return index.slice(0, at) + line + index.slice(at);
}

/** DESIGN.md with a row for the component, at the end of its components table. */
export function withDesignRow(design: string, name: string): string {
  const lines = design.split("\n");
  const section = lines.findIndex((l) => l.startsWith("## 3. Components"));
  const header = lines.findIndex((l, i) => i > section && l.startsWith("|"));
  if (section < 0 || header < 0)
    throw new Error(
      'DESIGN.md has no components table under "## 3. Components". Put it back, then run this again.',
    );
  let end = header;
  while (lines[end + 1]?.startsWith("|")) end++;
  lines.splice(
    end + 1,
    0,
    `| Not designed yet: ask a code owner | \`${name}\` | Made by \`bun run new component\`. A code owner fills this row in with the design |`,
  );
  return lines.join("\n");
}

/** Every file a new component writes or changes, or why it can't be made. */
export function planComponent(
  name: string,
  repo: Repo,
): { problem: string } | { files: FileToWrite[] } {
  const problem = nameProblem(name, repo.components);
  if (problem) return { problem };
  const files = COMPONENT_TEMPLATES.map((template) => ({
    path: COMPONENT_FILES[template]?.(name) ?? "",
    content: (repo.templates[template] ?? "").replaceAll("__Name__", name),
  }));
  return {
    files: [
      ...files,
      { path: INDEX, content: withExport(repo.index, name) },
      { path: DESIGN, content: withDesignRow(repo.design, name) },
    ],
  };
}
