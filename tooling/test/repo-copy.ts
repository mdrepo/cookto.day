import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// A throwaway copy of this repo, for tests that run commands which write
// files (like `bun run new`). Every file git knows about, committed or not,
// with the installed packages linked rather than copied.

const ROOT = join(import.meta.dir, "../..");

export function copyRepo(): { dir: string; remove: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "cookto-repo-"));
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter((f) => f && existsSync(join(ROOT, f)));
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(ROOT, f), join(dir, f), { verbatimSymlinks: true });
  }
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));
  // Each app links the workspace packages with relative links, so copied
  // links point into the copy.
  for (const app of ["apps/web", "apps/kit"]) {
    const modules = join(ROOT, app, "node_modules");
    if (existsSync(modules) && lstatSync(modules).isDirectory())
      cpSync(modules, join(dir, app, "node_modules"), {
        recursive: true,
        verbatimSymlinks: true,
      });
  }
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return {
    dir,
    remove: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Runs a command in `cwd`; returns its exit code and everything it printed. */
export function run(
  cwd: string,
  command: string[],
): { code: number; output: string } {
  const [cmd = "", ...args] = command;
  try {
    const output = execFileSync(cmd, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}
