import { describe, expect, test } from "bun:test";
import { checkCommitSubjects } from "../scripts/commit-rules.js";

describe("checkCommitSubjects", () => {
  test.each([
    "feat: suggest dishes from the pantry",
    "fix(pantry): count days left from the bill date",
    "refactor!: rename the pantry storage key",
    "fixup! fix(pantry): x",
    "Merge branch 'main'",
  ])("accepts %p", (subject) => {
    expect(checkCommitSubjects([subject])).toEqual([]);
  });

  test.each([
    "Fixed the pantry",
    "style: format code",
    "fix: ",
    "fix(Pantry): x",
  ])("rejects %p", (subject) => {
    expect(checkCommitSubjects([subject])).toHaveLength(1);
  });

  test("lists the commits that aren't conventional", () => {
    const [problem] = checkCommitSubjects(["feat: ok", "style: format", "wip"]);
    expect(problem).toContain('"style: format"');
    expect(problem).toContain('"wip"');
    expect(problem).not.toContain('"feat: ok"');
  });
});
