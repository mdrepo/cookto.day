import { describe, expect, test } from "bun:test";
import {
  commands,
  honour,
  hooks,
  people,
  readGitHub,
  tests,
} from "../scripts/city-people-lib.js";

const run = (conclusion: string | null, sha: string, title: string) => ({
  conclusion,
  created_at: "2026-10-23T17:06:36Z",
  display_title: title,
  html_url: `https://github.com/x/runs/${sha}`,
  head_sha: sha,
});

describe("the sentry", () => {
  test("knows each command by what it's for, and lists the unknown as they run", () => {
    const g = commands({ dev: "bun run x", knip: "knip", zap: "bun zap.ts" });
    expect(g.map((x) => x.group)).toEqual(["Run and build", "Check", "Other"]);
    expect(g[2]?.rows).toEqual([["zap", "bun zap.ts"]]);
  });
  test("names only the hooks the repo has", () => {
    expect(hooks([".githooks/pre-push"]).map((r) => r[0])).toEqual(["push"]);
  });
});

describe("the doctor", () => {
  test("counts test files and walks, and each walk's known bugs", () => {
    const files = [
      "a/test/x.test.ts",
      "apps/web/e2e/pantry.spec.ts",
      "apps/web/e2e/home.spec.ts",
    ];
    const read = (p: string) =>
      p.includes("pantry") ? "test.fail(1); test.fail(2)" : "";
    expect(tests(files, read)).toEqual({
      files: 1,
      walks: 2,
      bugs: [["pantry.spec.ts", "2 known bugs"]],
    });
  });
});

describe("the guard of honour", () => {
  test("stands only for the gateless checks the repo runs", () => {
    expect(honour({ knip: "knip", dev: "x" })).toEqual([
      ["knip", "Nothing unused"],
    ]);
  });
});

describe("what GitHub says", () => {
  test("main's last finished CI run, the deliveries, and what's merged but not live", () => {
    const ask = (p: string) =>
      p.includes("ci.yml")
        ? {
            workflow_runs: [
              run(null, "c", "running"),
              run("failure", "b", "feat: b"),
            ],
          }
        : p.includes("deploy.yml")
          ? {
              workflow_runs: [
                run("failure", "b", "feat: b"),
                run("success", "a", "feat: a"),
              ],
            }
          : { commits: [{ commit: { message: "feat: b\n\nbody" } }] };
    const news = readGitHub(ask);
    expect(news?.ci?.ok).toBe(false);
    expect(news?.ci?.title).toBe("feat: b");
    expect(news?.deploys.map((d) => d.ok)).toEqual([false, true]);
    expect(news?.waiting).toEqual(["feat: b"]);
  });
  test("says nothing when GitHub can't be read", () => {
    expect(readGitHub(() => null)).toBeNull();
    const p = people({
      files: [],
      read: () => "",
      scripts: {},
      ask: () => null,
    });
    expect(p.github).toBeNull();
  });
});
