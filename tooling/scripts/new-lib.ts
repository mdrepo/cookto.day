// Pure parts of the generator (scripts/new.ts), with unit tests through it.
// ADR 0019: a new part starts from templates in tooling/templates/, so it
// has every file the checks ask for from its first commit.

/** What the generator makes: a component, or a layout (ADR 0019). */
export type Kind = "component" | "layout";

/** Each kind's folder in packages/ui/src, and its table in DESIGN.md. */
export const KINDS: Record<Kind, { folder: string; heading: string }> = {
  component: { folder: "components", heading: "## 3. Components" },
  layout: { folder: "layouts", heading: "### Layouts" },
};

/** Where each template goes, for a part called `name` of a kind. */
function targets(kind: Kind, name: string): Record<string, string> {
  const dir = `packages/ui/src/${KINDS[kind].folder}/${name}`;
  return {
    "Name.tsx.tmpl": `${dir}/${name}.tsx`,
    "Name.module.css.tmpl": `${dir}/${name}.module.css`,
    "Name.kit.tsx.tmpl": `${dir}/${name}.kit.tsx`,
    "Name.test.tsx.tmpl": `packages/ui/test/${name}.test.tsx`,
  };
}

export const COMPONENT_TEMPLATES = Object.keys(targets("component", "X"));
export const INDEX = "packages/ui/src/index.ts";
export const DESIGN = "DESIGN.md";

export interface Repo {
  /** Names of the components and layouts that exist: they share a namespace. */
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
    return `${name} already exists in packages/ui/src. Reuse it, or pick another name.`;
  return null;
}

/** index.ts with the part's export, in name order among its kind's. */
export function withExport(
  index: string,
  name: string,
  kind: Kind = "component",
): string {
  const folder = KINDS[kind].folder;
  const line = `export { ${name} } from "./${folder}/${name}/${name}.js";\n`;
  const exports = [
    ...index.matchAll(
      new RegExp(`^export \\{[^}]*\\} from "\\./${folder}/(\\w+)/`, "gm"),
    ),
  ];
  const after = exports.find((m) => (m[1] ?? "") > name);
  const at =
    after?.index ??
    (exports.length > 0
      ? index.indexOf("\n", index.indexOf(exports.at(-1)?.[0] ?? "")) + 1
      : index.length);
  return index.slice(0, at) + line + index.slice(at);
}

/** DESIGN.md with a row for the part, at the end of its kind's table. */
export function withDesignRow(
  design: string,
  name: string,
  kind: Kind = "component",
): string {
  const { heading } = KINDS[kind];
  const lines = design.split("\n");
  const section = lines.findIndex((l) => l.startsWith(heading));
  const header = lines.findIndex((l, i) => i > section && l.startsWith("|"));
  if (section < 0 || header < 0)
    throw new Error(
      `DESIGN.md has no table under "${heading}". Put it back, then run this again.`,
    );
  let end = header;
  while (lines[end + 1]?.startsWith("|")) end++;
  lines.splice(
    end + 1,
    0,
    `| Not designed yet: ask a code owner | \`${name}\` | Made by \`bun run new ${kind}\`. A code owner fills this row in with the design |`,
  );
  return lines.join("\n");
}

/** Every file a new part writes or changes, or why it can't be made. */
export function planComponent(
  name: string,
  repo: Repo,
  kind: Kind = "component",
): { problem: string } | { files: FileToWrite[] } {
  const problem = nameProblem(name, repo.components);
  if (problem) return { problem };
  const files = Object.entries(targets(kind, name)).map(([template, path]) => ({
    path,
    content: (repo.templates[template] ?? "").replaceAll("__Name__", name),
  }));
  return {
    files: [
      ...files,
      { path: INDEX, content: withExport(repo.index, name, kind) },
      { path: DESIGN, content: withDesignRow(repo.design, name, kind) },
    ],
  };
}
