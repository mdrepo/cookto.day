import { basename, dirname, join } from "node:path";

// The city (bun run city) draws the repo as a night city, every file a
// building. These are the pure parts about one file: whether it's a building,
// which district it stands in, what it declares, and where its imports point.
// Unit tests in test/city-lib.test.ts; scripts/city.ts reads the repo.

export interface Declaration {
  name: string;
  /** The `/** ... *​/` comment above it, as one line; "" when there is none. */
  doc: string;
  exported: boolean;
  line: number;
  kind: "component" | "hook" | "function" | "class" | "value" | "re-export";
}

/** Code that becomes a building: an app's or a package's src/, written by hand. */
export function isCode(path: string): boolean {
  return (
    /^(apps\/(web|api|kit)|packages\/[^/]+)\/src\/.*\.(ts|tsx)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !path.includes("/i18n/") &&
    !/\/packs\/[^/]+\.(photos|steps)\.ts$/.test(path)
  );
}

/** A file's district (the page's KIND) and its block within it. */
export function layerOf(path: string): [string, string] {
  const feature = /^apps\/web\/src\/features\/([^/]+)\/(.+)$/.exec(path);
  if (feature?.[1] && feature[2]) {
    const file = basename(feature[2]);
    const hook = /^use[A-Z]/.test(file) || !file.endsWith(".tsx");
    return [hook ? "hooks" : "screens", feature[1]];
  }
  if (path.startsWith("apps/web/src/"))
    return [path.endsWith(".tsx") ? "screens" : "hooks", "app shell"];
  if (path.startsWith("apps/api/")) {
    const dir = path.split("/")[3] ?? "";
    return ["api", dir.includes(".") ? "worker" : dir];
  }
  if (path.startsWith("apps/kit/")) return ["ui", "kit page"];
  const kit = /^packages\/ui\/src\/(components|layouts)\//.exec(path);
  if (kit?.[1]) return ["ui", kit[1]];
  if (path.startsWith("packages/ui/")) return ["ui", "foundation"];
  if (path.startsWith("packages/data/src/packs/")) return ["packs", "bundles"];
  if (path.startsWith("packages/data/")) return ["data", "repositories"];
  if (path.startsWith("packages/data-web/"))
    return ["data", "IndexedDB adapter"];
  if (path.startsWith("packages/usecases/")) return ["usecases", "use cases"];
  if (path.startsWith("packages/testing/")) return ["engine", "testing"];
  if (path.startsWith("packages/messenger/")) return ["messenger", "messenger"];
  if (path.startsWith("packages/workflows/")) return ["workflows", "workflows"];
  if (path.startsWith("packages/templates/")) return ["workflows", "templates"];
  return ["engine", "engine"];
}

/** The path as the city shows it: the feature, or the package, then the file. */
export function shortPath(path: string): string {
  return path
    .replace(/^apps\/web\/src\/features\//, "")
    .replace(/^apps\/web\/src\//, "web/")
    .replace(/^packages\/([^/]+)\/src\//, "$1/")
    .replace(/^apps\/([^/]+)\/src\//, "$1/");
}

const DECLARATION =
  /^(export\s+)?(default\s+)?(?:async\s+)?(?:(function)\*?\s+(\w+)|(const|let)\s+(\w+)\s*[=:]|(class)\s+(\w+))/;

function kindOf(keyword: string, name: string): Declaration["kind"] {
  if (keyword === "class") return "class";
  if (keyword !== "function") return "value";
  if (/^use[A-Z]/.test(name)) return "hook";
  return /^[A-Z]/.test(name) ? "component" : "function";
}

/** The names an `export { a, b as c }` line passes on, reading ahead if it wraps. */
function reExports(lines: string[], at: number): string[] {
  let text = lines[at] ?? "";
  for (let i = at + 1; !text.includes("}") && i < at + 12; i++)
    text += ` ${lines[i] ?? ""}`;
  return text
    .replace(/[\s\S]*?\{/, "")
    .replace(/\}[\s\S]*/, "")
    .split(",")
    .map((x) => x.trim().replace(/\s+as\s+.*/, ""))
    .filter((x) => x && !/^type\b/.test(x));
}

/** What a file declares at its top level, each with the doc comment above it. */
export function declarations(src: string): Declaration[] {
  const found: Declaration[] = [];
  const lines = src.split("\n");
  let doc: string[] = [];
  let inDoc = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.trim();
    if (inDoc) {
      doc.push(line.replace(/^\*\/?\s?/, "").replace(/\*\/$/, ""));
      if (line.endsWith("*/")) inDoc = false;
      continue;
    }
    if (line.startsWith("/**")) {
      doc = [line.replace(/^\/\*\*\s?/, "").replace(/\s?\*\/$/, "")];
      inDoc = !line.endsWith("*/");
      continue;
    }
    if (!line || line.startsWith("//") || /^\s/.test(raw)) continue;
    const m = DECLARATION.exec(line);
    const star = /from\s+["']([^"']+)["']/.exec(line)?.[1];
    if (m) {
      const name = m[4] ?? m[6] ?? m[8] ?? "";
      found.push({
        name,
        doc: doc.join(" ").replace(/\s+/g, " ").trim(),
        exported: !!m[1],
        line: i + 1,
        kind: kindOf(m[3] ?? m[5] ?? m[7] ?? "", name),
      });
    } else if (/^export\s+\*\s+from/.test(line) && star) {
      const from = star.replace(/\.js$/, "");
      found.push({
        name: `everything from ${from}`,
        doc: "",
        exported: true,
        line: i + 1,
        kind: "re-export",
      });
    } else if (/^export\s*\{/.test(line)) {
      for (const name of reExports(lines, i))
        found.push({
          name,
          doc: "",
          exported: true,
          line: i + 1,
          kind: "re-export",
        });
    }
    doc = [];
  }
  return found;
}

/**
 * Where an import points, as a repo path, or undefined for a package from
 * outside. `exists` says whether a path is a building; `pkgExports` maps an
 * "@cookto/x" name to the file it exports.
 */
export function resolveImport(
  from: string,
  spec: string,
  exists: (path: string) => boolean,
  pkgExports: Record<string, string>,
): string | undefined {
  if (!spec.startsWith(".")) return pkgExports[spec];
  const base = join(dirname(from), spec).replace(/\.js$/, "");
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  return candidates.find(exists);
}

/** Every module a file imports, as written. */
export function importSpecs(src: string): string[] {
  return [...src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
    (m) => m[1] ?? "",
  );
}
