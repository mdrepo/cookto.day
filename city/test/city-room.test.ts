import { describe, expect, test } from "bun:test";
import { parseHistory, type Repo } from "../scripts/city-graph-lib.js";
import { skills, specs, stamps } from "../scripts/city-room-lib.js";

// Round four (#252): the town hall's filing cabinet of specs, the
// workshop's skills with their steps, and the stamps of `bun run new`. A
// made-up repo with a little of each.

const files: Record<string, string> = {
  "specs/TEMPLATE.md": "# #000: Title",
  "specs/104-cooked-it.md": "# #104: We cooked this\n\nWhy",
  "specs/240-meal-times.md": "# #240: Meal times, and days off\n",
  ".agents/skills/tdd-change/SKILL.md": [
    "---",
    "name: tdd-change",
    "description: Step-by-step workflow for ANY change: a bug fix, a feature. Use it always.",
    "---",
    "# Making a change",
    "## Phase 0: Spec, then stop",
    "## Phase 1: Red (failing tests, committed alone)",
    "## Phase 2: Green",
  ].join("\n"),
  "tooling/templates/component/Name.tsx.tmpl": "",
  "tooling/templates/screen/Screen.tsx.tmpl": "",
};

const log = [
  "@@a1|2026-10-16|docs: #104 spec: cooked it",
  "A\tspecs/104-cooked-it.md",
  "@@b2|2026-10-17|feat: #104 we cooked this (#105)",
  "M\tapps/web/src/app.tsx",
  "@@c3|2026-10-21|docs: #240 spec: meal times",
  "A\tspecs/240-meal-times.md",
].join("\n");

const repo: Repo = {
  files: Object.keys(files),
  read: (p) => files[p] ?? "",
  history: parseHistory(log),
};

describe("the town hall's filing cabinet", () => {
  test("one drawer per spec, newest first; built once a feat names it", () => {
    expect(specs(repo)).toEqual([
      {
        n: 240,
        file: "specs/240-meal-times.md",
        title: "Meal times, and days off",
        state: "approved",
      },
      {
        n: 104,
        file: "specs/104-cooked-it.md",
        title: "We cooked this",
        state: "built",
      },
    ]);
  });
});

describe("the workshop", () => {
  test("each skill a workbench, its steps in order, its use in a sentence", () => {
    expect(skills(repo)).toEqual([
      {
        name: "tdd-change",
        file: ".agents/skills/tdd-change/SKILL.md",
        what: "Step-by-step workflow for ANY change.",
        steps: [
          "Spec, then stop",
          "Red (failing tests, committed alone)",
          "Green",
        ],
      },
    ]);
  });

  test("each generator a stamp, with the files it makes", () => {
    const made = stamps(repo);
    expect(made.map((s) => s.command)).toEqual([
      "bun run new component <Name>",
      "bun run new layout <Name>",
      "bun run new screen <feature>",
    ]);
    expect(made[0]?.makes).toContain(
      "packages/ui/src/components/<Name>/<Name>.tsx",
    );
    expect(made[2]?.makes).toContain("apps/web/e2e/<feature>.spec.ts");
    expect(stamps({ ...repo, files: [] })).toEqual([]);
  });
});
