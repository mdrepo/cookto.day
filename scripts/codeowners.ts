// .github/CODEOWNERS is the single list of protected paths: GitHub enforces
// owner review on them, and the Claude Code settings and hooks read the same
// list, so there's one place to change.

/** Paths from CODEOWNERS, without the leading slash. Directories end in "/". */
export function ownedPaths(codeowners: string): string[] {
  return codeowners
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => (line.split(/\s+/)[0] ?? "").replace(/^\//, ""))
    .filter(Boolean);
}

/** Whether a repo-relative path is covered by one of the owned paths. */
export function isOwned(path: string, owned: string[]): boolean {
  return owned.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

/** The Claude Code `permissions.ask` rules that protect the owned paths. */
export function askRules(owned: string[]): string[] {
  return owned.map((p) => (p.endsWith("/") ? `Edit(${p}**)` : `Edit(${p})`));
}
